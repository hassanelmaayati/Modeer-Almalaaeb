import json
import asyncio
from datetime import datetime
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from backend.app.database import AsyncSessionLocal
from backend.app.models import Room, Team, Participant, User, JoinRequest, ChatMessage
from backend.app.schemas import RoomOut, UserPublic, ParticipantOut, TeamOut, SportOut
from backend.app.auth import get_user_from_token_str
from backend.app.routes.rooms import format_room_out

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}
        self.host_disconnect_tasks: Dict[int, asyncio.Task] = {}

    async def connect(self, room_id: int, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][user_id] = websocket

        if room_id in self.host_disconnect_tasks:
            self.host_disconnect_tasks[room_id].cancel()
            del self.host_disconnect_tasks[room_id]

    def disconnect(self, room_id: int, user_id: int):
        if room_id in self.active_connections:
            if user_id in self.active_connections[room_id]:
                del self.active_connections[room_id][user_id]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, room_id: int, message: dict):
        if room_id in self.active_connections:
            connections = list(self.active_connections[room_id].items())
            for uid, ws in connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def send_to_user(self, room_id: int, user_id: int, message: dict):
        if room_id in self.active_connections and user_id in self.active_connections[room_id]:
            try:
                await self.active_connections[room_id][user_id].send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

async def get_full_room_data(db: AsyncSession, room_id: int) -> Optional[Room]:
    res = await db.execute(
        select(Room)
        .options(
            selectinload(Room.host),
            selectinload(Room.sport),
            selectinload(Room.teams).selectinload(Team.participants).selectinload(Participant.user)
        )
        .where(Room.id == room_id)
    )
    return res.scalar_one_or_none()

async def schedule_host_migration(room_id: int, old_host_id: int, grace_period_seconds: int = 3):
    await asyncio.sleep(grace_period_seconds)
    async with AsyncSessionLocal() as db:
        room = await get_full_room_data(db, room_id)
        if not room or room.host_id != old_host_id or room.status == "cancelled":
            return

        all_participants = []
        for t in room.teams:
            for p in t.participants:
                if p.user_id != old_host_id:
                    all_participants.append(p)

        if not all_participants:
            return

        all_participants.sort(key=lambda p: p.joined_at)
        new_host = all_participants[0]

        room.host_id = new_host.user_id
        new_host.role = "host"

        for t in room.teams:
            for p in t.participants:
                if p.user_id == old_host_id:
                    p.role = "player"

        await db.commit()

        await manager.broadcast_to_room(room_id, {
            "type": "host_changed",
            "payload": {"new_host_id": new_host.user_id}
        })

        updated_room = await get_full_room_data(db, room_id)
        if updated_room:
            room_dict = format_room_out(updated_room).model_dump(mode="json")
            await manager.broadcast_to_room(room_id, {
                "type": "room_state",
                "payload": room_dict
            })

@router.websocket("/ws/rooms/{room_id}")
async def websocket_room_endpoint(websocket: WebSocket, room_id: int, token: Optional[str] = None):
    if not token:
        await websocket.close(code=4001)
        return

    async with AsyncSessionLocal() as db:
        user = await get_user_from_token_str(token, db)
        if not user:
            await websocket.close(code=4002)
            return

        room = await get_full_room_data(db, room_id)
        if not room:
            await websocket.close(code=4004)
            return

    user_id = user.id
    await manager.connect(room_id, user_id, websocket)

    async with AsyncSessionLocal() as db:
        room = await get_full_room_data(db, room_id)
        if room:
            room_dict = format_room_out(room).model_dump(mode="json")
            await websocket.send_json({
                "type": "room_state",
                "payload": room_dict
            })

    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "payload": {"code": "invalid_json", "message": "Invalid JSON format"}})
                continue

            msg_type = data.get("type")
            payload = data.get("payload", {})

            async with AsyncSessionLocal() as db:
                room = await get_full_room_data(db, room_id)
                if not room:
                    await websocket.send_json({"type": "error", "payload": {"code": "room_not_found", "message": "Room no longer exists"}})
                    break

                is_host = (room.host_id == user_id)

                if msg_type == "join_slot":
                    if room.status in ["locked", "in_progress", "completed", "cancelled"]:
                        await websocket.send_json({"type": "error", "payload": {"code": "room_locked", "message": f"Room is {room.status}"}})
                        continue

                    if room.join_mode == "approval_required" and not is_host:
                        await websocket.send_json({"type": "error", "payload": {"code": "approval_required", "message": "Host approval is required to join this room"}})
                        continue

                    target_team_id = payload.get("team_id")
                    target_slot = payload.get("slot_number")

                    await db.execute(select(Room).where(Room.id == room_id).with_for_update())

                    target_team = None
                    for t in room.teams:
                        if t.id == target_team_id:
                            target_team = t
                            break
                    if not target_team and room.teams:
                        target_team = room.teams[0]

                    taken = False
                    for p in target_team.participants:
                        if p.slot_number == target_slot:
                            taken = True
                            break

                    if taken:
                        await websocket.send_json({"type": "error", "payload": {"code": "slot_already_taken", "message": "That slot was just taken!"}})
                        continue

                    p_res = await db.execute(select(Participant).where(Participant.room_id == room_id, Participant.user_id == user_id))
                    existing_p = p_res.scalar_one_or_none()

                    if existing_p:
                        old_team_id = existing_p.team_id
                        old_slot = existing_p.slot_number
                        existing_p.team_id = target_team.id
                        existing_p.slot_number = target_slot
                        if old_team_id and old_slot:
                            await manager.broadcast_to_room(room_id, {
                                "type": "slot_freed",
                                "payload": {"team_id": old_team_id, "slot_number": old_slot}
                            })
                    else:
                        new_p = Participant(
                            room_id=room_id,
                            team_id=target_team.id,
                            user_id=user_id,
                            slot_number=target_slot,
                            role="player",
                            is_ready=False
                        )
                        db.add(new_p)

                    try:
                        await db.commit()
                    except Exception:
                        await db.rollback()
                        await websocket.send_json({"type": "error", "payload": {"code": "slot_already_taken", "message": "Slot was just claimed by another player"}})
                        continue

                    await manager.broadcast_to_room(room_id, {
                        "type": "slot_taken",
                        "payload": {
                            "team_id": target_team.id,
                            "slot_number": target_slot,
                            "user": UserPublic.model_validate(user).model_dump(mode="json")
                        }
                    })

                    updated_room = await get_full_room_data(db, room_id)
                    if updated_room:
                        await manager.broadcast_to_room(room_id, {
                            "type": "room_state",
                            "payload": format_room_out(updated_room).model_dump(mode="json")
                        })

                elif msg_type == "leave_slot":
                    p_res = await db.execute(select(Participant).where(Participant.room_id == room_id, Participant.user_id == user_id))
                    p = p_res.scalar_one_or_none()
                    if p:
                        old_team_id = p.team_id
                        old_slot = p.slot_number
                        await db.delete(p)
                        await db.commit()

                        if old_team_id and old_slot:
                            await manager.broadcast_to_room(room_id, {
                                "type": "slot_freed",
                                "payload": {"team_id": old_team_id, "slot_number": old_slot}
                            })

                        updated_room = await get_full_room_data(db, room_id)
                        if updated_room:
                            await manager.broadcast_to_room(room_id, {
                                "type": "room_state",
                                "payload": format_room_out(updated_room).model_dump(mode="json")
                            })

                elif msg_type == "toggle_ready":
                    p_res = await db.execute(select(Participant).where(Participant.room_id == room_id, Participant.user_id == user_id))
                    p = p_res.scalar_one_or_none()
                    if p:
                        p.is_ready = not p.is_ready
                        await db.commit()
                        await manager.broadcast_to_room(room_id, {
                            "type": "ready_changed",
                            "payload": {"user_id": user_id, "is_ready": p.is_ready}
                        })

                elif msg_type == "send_chat":
                    msg_text = payload.get("message", "").strip()
                    if msg_text:
                        cm = ChatMessage(room_id=room_id, user_id=user_id, message=msg_text)
                        db.add(cm)
                        await db.commit()
                        await db.refresh(cm)
                        await manager.broadcast_to_room(room_id, {
                            "type": "chat_message",
                            "payload": {
                                "id": cm.id,
                                "user_id": user_id,
                                "user_name": user.name,
                                "user_avatar": user.profile_picture_url,
                                "message": msg_text,
                                "timestamp": cm.created_at.isoformat()
                            }
                        })

                elif msg_type == "request_join":
                    target_team_id = payload.get("team_id")
                    target_slot = payload.get("slot_number")

                    jr_res = await db.execute(select(JoinRequest).where(JoinRequest.room_id == room_id, JoinRequest.user_id == user_id))
                    jr = jr_res.scalar_one_or_none()
                    if jr:
                        jr.status = "pending"
                        jr.team_id = target_team_id
                        jr.slot_number = target_slot
                    else:
                        jr = JoinRequest(
                            room_id=room_id,
                            user_id=user_id,
                            team_id=target_team_id,
                            slot_number=target_slot,
                            status="pending"
                        )
                        db.add(jr)
                    await db.commit()
                    await db.refresh(jr)

                    await manager.send_to_user(room_id, room.host_id, {
                        "type": "join_request_received",
                        "payload": {
                            "request_id": jr.id,
                            "user": UserPublic.model_validate(user).model_dump(mode="json"),
                            "team_id": target_team_id,
                            "slot_number": target_slot
                        }
                    })

                elif msg_type == "edit_room":
                    if not is_host:
                        await websocket.send_json({"type": "error", "payload": {"code": "not_authorized", "message": "Only host can perform this action"}})
                        continue

                    changed = {}
                    if "location_text" in payload:
                        room.location_text = payload["location_text"]
                        changed["location_text"] = room.location_text
                    if "start_time" in payload:
                        room.start_time = datetime.fromisoformat(payload["start_time"]).replace(tzinfo=None)
                        changed["start_time"] = room.start_time.isoformat()
                    if "skill_level" in payload:
                        room.skill_level = payload["skill_level"]
                        changed["skill_level"] = room.skill_level

                    await db.commit()
                    await manager.broadcast_to_room(room_id, {
                        "type": "room_updated",
                        "payload": {"changed_fields": changed}
                    })

                    updated_room = await get_full_room_data(db, room_id)
                    if updated_room:
                        await manager.broadcast_to_room(room_id, {
                            "type": "room_state",
                            "payload": format_room_out(updated_room).model_dump(mode="json")
                        })

                elif msg_type == "move_player":
                    if not is_host:
                        await websocket.send_json({"type": "error", "payload": {"code": "not_authorized", "message": "Only host can perform this action"}})
                        continue

                    target_user_id = payload.get("user_id")
                    target_team_id = payload.get("target_team_id")
                    target_slot = payload.get("target_slot")

                    p_res = await db.execute(select(Participant).where(Participant.room_id == room_id, Participant.user_id == target_user_id))
                    p = p_res.scalar_one_or_none()
                    if p:
                        old_team_id = p.team_id
                        old_slot = p.slot_number
                        p.team_id = target_team_id
                        p.slot_number = target_slot
                        try:
                            await db.commit()
                            if old_team_id and old_slot:
                                await manager.broadcast_to_room(room_id, {
                                    "type": "slot_freed",
                                    "payload": {"team_id": old_team_id, "slot_number": old_slot}
                                })
                        except Exception:
                            await db.rollback()
                            await websocket.send_json({"type": "error", "payload": {"code": "slot_already_taken", "message": "Target slot is occupied"}})
                            continue

                        updated_room = await get_full_room_data(db, room_id)
                        if updated_room:
                            await manager.broadcast_to_room(room_id, {
                                "type": "room_state",
                                "payload": format_room_out(updated_room).model_dump(mode="json")
                            })

                elif msg_type == "kick_player":
                    if not is_host:
                        await websocket.send_json({"type": "error", "payload": {"code": "not_authorized", "message": "Only host can perform this action"}})
                        continue

                    target_user_id = payload.get("user_id")
                    if target_user_id == room.host_id:
                        await websocket.send_json({"type": "error", "payload": {"code": "cannot_kick_host", "message": "Cannot kick host"}})
                        continue

                    p_res = await db.execute(select(Participant).where(Participant.room_id == room_id, Participant.user_id == target_user_id))
                    p = p_res.scalar_one_or_none()
                    if p:
                        old_team_id = p.team_id
                        old_slot = p.slot_number
                        await db.delete(p)
                        await db.commit()

                        if old_team_id and old_slot:
                            await manager.broadcast_to_room(room_id, {
                                "type": "slot_freed",
                                "payload": {"team_id": old_team_id, "slot_number": old_slot}
                            })

                        await manager.broadcast_to_room(room_id, {
                            "type": "player_kicked",
                            "payload": {"user_id": target_user_id}
                        })

                        updated_room = await get_full_room_data(db, room_id)
                        if updated_room:
                            await manager.broadcast_to_room(room_id, {
                                "type": "room_state",
                                "payload": format_room_out(updated_room).model_dump(mode="json")
                            })

                elif msg_type == "lock_room":
                    if not is_host:
                        await websocket.send_json({"type": "error", "payload": {"code": "not_authorized", "message": "Only host can perform this action"}})
                        continue

                    room.status = "locked" if room.status != "locked" else "open"
                    await db.commit()

                    await manager.broadcast_to_room(room_id, {
                        "type": "room_status_changed",
                        "payload": {"status": room.status}
                    })

                    updated_room = await get_full_room_data(db, room_id)
                    if updated_room:
                        await manager.broadcast_to_room(room_id, {
                            "type": "room_state",
                            "payload": format_room_out(updated_room).model_dump(mode="json")
                        })

                elif msg_type == "start_match":
                    if not is_host:
                        await websocket.send_json({"type": "error", "payload": {"code": "not_authorized", "message": "Only host can perform this action"}})
                        continue

                    room.status = "in_progress"
                    await db.commit()

                    await manager.broadcast_to_room(room_id, {
                        "type": "room_status_changed",
                        "payload": {"status": "in_progress"}
                    })

                    updated_room = await get_full_room_data(db, room_id)
                    if updated_room:
                        await manager.broadcast_to_room(room_id, {
                            "type": "room_state",
                            "payload": format_room_out(updated_room).model_dump(mode="json")
                        })

                elif msg_type == "cancel_room":
                    if not is_host:
                        await websocket.send_json({"type": "error", "payload": {"code": "not_authorized", "message": "Only host can perform this action"}})
                        continue

                    room.status = "cancelled"
                    await db.commit()

                    await manager.broadcast_to_room(room_id, {
                        "type": "room_status_changed",
                        "payload": {"status": "cancelled"}
                    })

                elif msg_type == "transfer_host":
                    if not is_host:
                        await websocket.send_json({"type": "error", "payload": {"code": "not_authorized", "message": "Only host can perform this action"}})
                        continue

                    new_host_id = payload.get("user_id")
                    p_res = await db.execute(select(Participant).where(Participant.room_id == room_id, Participant.user_id == new_host_id))
                    new_p = p_res.scalar_one_or_none()
                    if new_p:
                        old_p_res = await db.execute(select(Participant).where(Participant.room_id == room_id, Participant.user_id == user_id))
                        old_p = old_p_res.scalar_one_or_none()
                        if old_p:
                            old_p.role = "player"

                        new_p.role = "host"
                        room.host_id = new_host_id
                        await db.commit()

                        await manager.broadcast_to_room(room_id, {
                            "type": "host_changed",
                            "payload": {"new_host_id": new_host_id}
                        })

                        updated_room = await get_full_room_data(db, room_id)
                        if updated_room:
                            await manager.broadcast_to_room(room_id, {
                                "type": "room_state",
                                "payload": format_room_out(updated_room).model_dump(mode="json")
                            })

    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
        async with AsyncSessionLocal() as db:
            room = await get_full_room_data(db, room_id)
            if room and room.host_id == user_id:
                task = asyncio.create_task(schedule_host_migration(room_id, user_id, grace_period_seconds=3))
                manager.host_disconnect_tasks[room_id] = task
