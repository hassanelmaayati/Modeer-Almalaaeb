import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models import User, Rating
from backend.app.schemas import UserOut, UserUpdate, UserPublic, UserRatingSummary, RatingOut
from backend.app.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserOut)
async def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.sports_interests is not None:
        current_user.sports_interests = user_update.sports_interests
    if user_update.profile_picture_url is not None:
        current_user.profile_picture_url = user_update.profile_picture_url

    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.get("/{user_id}", response_model=UserPublic)
async def get_user_public(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/{user_id}/ratings", response_model=UserRatingSummary)
async def get_user_ratings(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ratings_result = await db.execute(
        select(Rating)
        .options(selectinload(Rating.rater))
        .where(Rating.rated_user_id == user_id)
        .order_by(Rating.created_at.desc())
    )
    ratings = ratings_result.scalars().all()

    rating_list = []
    for r in ratings:
        rating_out = RatingOut(
            id=r.id,
            room_id=r.room_id,
            rater_id=r.rater_id,
            rated_user_id=r.rated_user_id,
            score=r.score,
            tags=r.tags,
            created_at=r.created_at,
            rater_name=r.rater.name if r.rater else None
        )
        rating_list.append(rating_out)

    return UserRatingSummary(
        user_id=user.id,
        rating_average=user.rating_average,
        rating_count=user.rating_count,
        ratings=rating_list
    )

@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    filename = f"avatar_user_{current_user.id}_{file.filename}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    avatar_url = f"/uploads/{filename}"
    current_user.profile_picture_url = avatar_url
    await db.commit()
    await db.refresh(current_user)

    return {"profile_picture_url": avatar_url}
