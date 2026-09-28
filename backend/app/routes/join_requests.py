from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models import Room, JoinRequest, Participant, User, Team
from backend.app.schemas import JoinRequestCreate, JoinRequestOut, JoinRequestResolve, UserPublic
from backend.app.auth import get_current_user

router = APIRouter(prefix="/rooms", tags=["Join Requests"])

@router.post("/{room_id}/join-requests", response_model=JoinRequestOut)
async def create_join_request(
    room_id: int,
    req_in: JoinRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_res = await db.execute(select(Room).where(Room.id == room_id))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.status in ["locked", "in_progress", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Room is closed for join requests")

    # Check if user already participant
    p_res = await db.execute(select(Participant).where(Participant.room_id == room_id, Participant.user_id == current_user.id))
    if p_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already in this room")

    # Check existing request
    jr_res = await db.execute(select(JoinRequest).where(JoinRequest.room_id == room_id, JoinRequest.user_id == current_user.id))
    existing_jr = jr_res.scalar_one_or_none()

    if existing_jr:
        existing_jr.status = "pending"
        existing_jr.team_id = req_in.team_id
        existing_jr.slot_number = req_in.slot_number
        await db.commit()
        await db.refresh(existing_jr)
        jr = existing_jr
    else:
        new_jr = JoinRequest(
            room_id=room_id,
            user_id=current_user.id,
            team_id=req_in.team_id,
            slot_number=req_in.slot_number,
            status="pending"
        )
        db.add(new_jr)
        await db.commit()
        await db.refresh(new_jr)
        jr = new_jr

    return JoinRequestOut(
        id=jr.id,
        room_id=jr.room_id,
        user_id=jr.user_id,
        team_id=jr.team_id,
        slot_number=jr.slot_number,
        status=jr.status,
        created_at=jr.created_at,
        user=UserPublic.model_validate(current_user)
    )

@router.get("/{room_id}/join-requests", response_model=List[JoinRequestOut])
async def list_join_requests(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_res = await db.execute(select(Room).where(Room.id == room_id))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only host can view join requests")

    res = await db.execute(
        select(JoinRequest)
        .options(selectinload(JoinRequest.user))
        .where(JoinRequest.room_id == room_id, JoinRequest.status == "pending")
        .order_by(JoinRequest.created_at.asc())
    )
    jrs = res.scalars().all()

    return [
        JoinRequestOut(
            id=jr.id,
            room_id=jr.room_id,
            user_id=jr.user_id,
            team_id=jr.team_id,
            slot_number=jr.slot_number,
            status=jr.status,
            created_at=jr.created_at,
            user=UserPublic.model_validate(jr.user)
        )
        for jr in jrs
    ]

@router.patch("/{room_id}/join-requests/{request_id}", response_model=JoinRequestOut)
async def resolve_join_request(
    room_id: int,
    request_id: int,
    action: JoinRequestResolve,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_res = await db.execute(
        select(Room)
        .options(selectinload(Room.teams).selectinload(Team.participants))
        .where(Room.id == room_id)
    )
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only host can manage join requests")

    jr_res = await db.execute(
        select(JoinRequest)
        .options(selectinload(JoinRequest.user))
        .where(JoinRequest.id == request_id, JoinRequest.room_id == room_id)
    )
    jr = jr_res.scalar_one_or_none()
    if not jr:
        raise HTTPException(status_code=404, detail="Join request not found")

    if action.status == "accepted":
        jr.status = "accepted"

        # Find target team and slot
        target_team = None
        if jr.team_id:
            for t in room.teams:
                if t.id == jr.team_id:
                    target_team = t
                    break
        if not target_team and room.teams:
            target_team = room.teams[0]

        target_slot = jr.slot_number
        taken_slots = {p.slot_number for p in target_team.participants}
        if not target_slot or target_slot in taken_slots:
            # find first available slot
            target_slot = None
            for s in range(1, target_team.slot_count + 1):
                if s not in taken_slots:
                    target_slot = s
                    break

        if not target_slot:
            raise HTTPException(status_code=400, detail="Target team is full")

        # Check if already participant
        p_res = await db.execute(select(Participant).where(Participant.room_id == room_id, Participant.user_id == jr.user_id))
        existing_p = p_res.scalar_one_or_none()
        if not existing_p:
            new_p = Participant(
                room_id=room_id,
                team_id=target_team.id,
                user_id=jr.user_id,
                slot_number=target_slot,
                role="player",
                is_ready=False
            )
            db.add(new_p)
    else:
        jr.status = "declined"

    await db.commit()

    return JoinRequestOut(
        id=jr.id,
        room_id=jr.room_id,
        user_id=jr.user_id,
        team_id=jr.team_id,
        slot_number=jr.slot_number,
        status=jr.status,
        created_at=jr.created_at,
        user=UserPublic.model_validate(jr.user)
    )
