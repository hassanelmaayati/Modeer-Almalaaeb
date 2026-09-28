from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.database import get_db
from backend.app.models import Sport
from backend.app.schemas import SportOut

router = APIRouter(prefix="/sports", tags=["Sports"])

@router.get("", response_model=List[SportOut])
async def list_sports(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sport).order_by(Sport.id))
    sports = result.scalars().all()
    return sports
