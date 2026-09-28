from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.app.database import get_db
from backend.app.models import Room, Rating, User
from backend.app.schemas import RatingBatchCreate, RatingOut
from backend.app.auth import get_current_user

router = APIRouter(prefix="/rooms", tags=["Ratings"])

@router.post("/{room_id}/ratings", response_model=List[RatingOut])
async def submit_ratings(
    room_id: int,
    batch: RatingBatchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_res = await db.execute(select(Room).where(Room.id == room_id))
    room = room_res.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only host can submit post-game ratings")

    saved_ratings = []
    for item in batch.ratings:
        if item.score < 1 or item.score > 5:
            continue
        if item.rated_user_id == current_user.id:
            continue # Cannot rate self

        # Check existing rating
        existing_res = await db.execute(
            select(Rating).where(
                Rating.room_id == room_id,
                Rating.rater_id == current_user.id,
                Rating.rated_user_id == item.rated_user_id
            )
        )
        rating_obj = existing_res.scalar_one_or_none()

        if rating_obj:
            rating_obj.score = item.score
            rating_obj.tags = item.tags
        else:
            rating_obj = Rating(
                room_id=room_id,
                rater_id=current_user.id,
                rated_user_id=item.rated_user_id,
                score=item.score,
                tags=item.tags
            )
            db.add(rating_obj)

        await db.flush()

        # Update rated user's average rating
        avg_res = await db.execute(
            select(func.avg(Rating.score), func.count(Rating.score))
            .where(Rating.rated_user_id == item.rated_user_id)
        )
        avg_score, count_score = avg_res.fetchone()

        rated_user_res = await db.execute(select(User).where(User.id == item.rated_user_id))
        rated_user = rated_user_res.scalar_one_or_none()
        if rated_user:
            rated_user.rating_average = round(float(avg_score or item.score), 2)
            rated_user.rating_count = int(count_score or 1)

        saved_ratings.append(rating_obj)

    await db.commit()

    return [
        RatingOut(
            id=r.id,
            room_id=r.room_id,
            rater_id=r.rater_id,
            rated_user_id=r.rated_user_id,
            score=r.score,
            tags=r.tags,
            created_at=r.created_at,
            rater_name=current_user.name
        )
        for r in saved_ratings
    ]
