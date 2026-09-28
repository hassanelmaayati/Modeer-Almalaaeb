import secrets
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models import Room, Team, Participant, User, Sport, JoinRequest
from backend.app.schemas import RoomCreate, RoomUpdate, RoomOut, RoomJoinRequest, ParticipantOut, TeamOut, UserPublic, SportOut
from backend.app.auth import get_current_user

router = APIRouter(prefix="/rooms", tags=["Rooms"])

def format_room_out(room: Room) -> RoomOut:
    team_outs = []
    total_participants = 0
    max_total_players = 0

    for team in room.teams:
        part_outs = []
        for p in team.participants:
            total_participants += 1
            part_outs.append(ParticipantOut(
                id=p.id,
                room_id=p.room_id,
                team_id=p.team_id,
                user_id=p.user_id,
                slot_number=p.slot_number,
                role=p.role,
                is_ready=p.is_ready,
                user=UserPublic.model_validate(p.user)
            ))
        max_total_players += team.slot_count
        team_outs.append(TeamOut(
            id=team.id,
            room_id=team.room_id,
            name=team.name,
            color=team.color,
            slot_count=team.slot_count,
            participants=part_outs
        ))

    return RoomOut(
        id=room.id,
        host_id=room.host_id,
        sport_id=room.sport_id,
        name=room.name,
        format=room.format,
        team_count=room.team_count,
        max_players_per_team=room.max_players_per_team,
        location_text=room.location_text,
        lat=room.lat,
        lng=room.lng,
        start_time=room.start_time,
        skill_level=room.skill_level,
        status=room.status,
        is_private=room.is_private,
        room_code=room.room_code,
        join_mode=room.join_mode,
        created_at=room.created_at,
        host=UserPublic.model_validate(room.host),
        sport=SportOut.model_validate(room.sport),
        teams=team_outs,
        current_player_count=total_participants,
        max_player_count=max_total_players
    )

@router.get("", response_model=List[RoomOut])
async def list_rooms(
    sport_id: Optional[int] = Query(None),
    skill_level: Optional[str] = Query(None),
    format: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(Room).options(
        selectinload(Room.host),
        selectinload(Room.sport),
        selectinload(Room.teams).selectinload(Team.participants).selectinload(Participant.user)
    )

    if sport_id:
        query = query.where(Room.sport_id == sport_id)
    if skill_level and skill_level != "All":
        query = query.where(Room.skill_level == skill_level)
    if format and format != "All":
        query = query.where(Room.format == format)
    if status:
        query = query.where(Room.status == status)
    else:
        query = query.where(Room.status != "cancelled")

    query = query.order_by(Room.start_time.asc())
    result = await db.execute(query)
    rooms = result.scalars().all()

    return [format_room_out(r) for r in rooms]

@router.post("", response_model=RoomOut)
async def create_room(
    room_in: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sport_res = await db.execute(select(Sport).where(Sport.id == room_in.sport_id))
    sport = sport_res.scalar_one_or_none()
    if not sport:
        raise HTTPException(status_code=400, detail="Invalid sport_id")

    room_code = room_in.room_code
    if room_in.is_private and not room_code:
        room_code = secrets.token_hex(3).upper()

    naive_start_time = room_in.start_time.replace(tzinfo=None)

    new_room = Room(
        host_id=current_user.id,
        sport_id=room_in.sport_id,
        name=room_in.name,
        format=room_in.format,
        team_count=room_in.team_count,
        max_players_per_team=room_in.max_players_per_team,
        location_text=room_in.location_text,
        lat=room_in.lat,
        lng=room_in.lng,
        start_time=naive_start_time,
        skill_level=room_in.skill_level,
        status="open",
        is_private=room_in.is_private,
        room_code=room_code,
        join_mode=room_in.join_mode
    )
    db.add(new_room)
    await db.flush()

    teams = []
    if room_in.teams and len(room_in.teams) > 0:
        for t_in in room_in.teams:
            team = Team(
                room_id=new_room.id,
                name=t_in.name,
                color=t_in.color,
                slot_count=t_in.slot_count
            )
            db.add(team)
            teams.append(team)
    else:
        team_colors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B"]
        for i in range(room_in.team_count):
            t_name = f"Team {chr(65 + i)}"
            team = Team(
                room_id=new_room.id,
                name=t_name,
                color=team_colors[i % len(team_colors)],
                slot_count=room_in.max_players_per_team
            )
            db.add(team)
            teams.append(team)

    await db.flush()

    host_participant = Participant(
        room_id=new_room.id,
        team_id=teams[0].id,
        user_id=current_user.id,
        slot_number=1,
        role="host",
        is_ready=True
    )
    db.add(host_participant)

    await db.commit()

    res = await db.execute(
        select(Room)
        .options(
            selectinload(Room.host),
            selectinload(Room.sport),
            selectinload(Room.teams).selectinload(Team.participants).selectinload(Participant.user)
        )
        .where(Room.id == new_room.id)
    )
    full_room = res.scalar_one()
    return format_room_out(full_room)

@router.get("/{room_id}", response_model=RoomOut)
async def get_room(room_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Room)
        .options(
            selectinload(Room.host),
            selectinload(Room.sport),
            selectinload(Room.teams).selectinload(Team.participants).selectinload(Participant.user)
        )
        .where(Room.id == room_id)
    )
    room = res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return format_room_out(room)

@router.patch("/{room_id}", response_model=RoomOut)
async def edit_room(
    room_id: int,
    room_update: RoomUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Room).where(Room.id == room_id))
    room = res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only host can edit room")

    if room_update.name is not None:
        room.name = room_update.name
    if room_update.location_text is not None:
        room.location_text = room_update.location_text
    if room_update.lat is not None:
        room.lat = room_update.lat
    if room_update.lng is not None:
        room.lng = room_update.lng
    if room_update.start_time is not None:
        room.start_time = room_update.start_time.replace(tzinfo=None)
    if room_update.skill_level is not None:
        room.skill_level = room_update.skill_level
    if room_update.is_private is not None:
        room.is_private = room_update.is_private
    if room_update.room_code is not None:
        room.room_code = room_update.room_code
    if room_update.join_mode is not None:
        room.join_mode = room_update.join_mode

    await db.commit()

    res = await db.execute(
        select(Room)
        .options(
            selectinload(Room.host),
            selectinload(Room.sport),
            selectinload(Room.teams).selectinload(Team.participants).selectinload(Participant.user)
        )
        .where(Room.id == room_id)
    )
    updated_room = res.scalar_one()
    return format_room_out(updated_room)

@router.delete("/{room_id}")
async def cancel_room(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Room).where(Room.id == room_id))
    room = res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only host can cancel room")

    room.status = "cancelled"
    await db.commit()
    return {"message": "Room cancelled successfully"}

@router.post("/{room_id}/join")
async def join_room_rest(
    room_id: int,
    req: RoomJoinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Room)
        .options(selectinload(Room.teams).selectinload(Team.participants))
        .where(Room.id == room_id)
    )
    room = res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.status in ["locked", "in_progress", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot join room in status '{room.status}'")

    if room.join_mode == "approval_required":
        raise HTTPException(status_code=400, detail="This room requires host approval. Submit a join request instead.")

    p_res = await db.execute(
        select(Participant).where(Participant.room_id == room_id, Participant.user_id == current_user.id)
    )
    existing_p = p_res.scalar_one_or_none()

    target_team = None
    target_slot = req.slot_number

    if req.team_id:
        for t in room.teams:
            if t.id == req.team_id:
                target_team = t
                break
        if not target_team:
            raise HTTPException(status_code=400, detail="Invalid team_id")
    else:
        target_team = room.teams[0]

    taken_slots = {p.slot_number for p in target_team.participants}
    if not target_slot:
        for s in range(1, target_team.slot_count + 1):
            if s not in taken_slots:
                target_slot = s
                break
        if not target_slot:
            raise HTTPException(status_code=400, detail="Team is full")
    else:
        if target_slot in taken_slots:
            raise HTTPException(status_code=400, detail="Slot already taken")

    if existing_p:
        existing_p.team_id = target_team.id
        existing_p.slot_number = target_slot
    else:
        new_p = Participant(
            room_id=room_id,
            team_id=target_team.id,
            user_id=current_user.id,
            slot_number=target_slot,
            role="player",
            is_ready=False
        )
        db.add(new_p)

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Slot already taken or error joining room")

    return {"message": "Joined room successfully", "team_id": target_team.id, "slot_number": target_slot}
