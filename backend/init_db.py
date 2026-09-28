import asyncio
from backend.app.database import engine, Base, AsyncSessionLocal
from backend.app.models import Sport
from sqlalchemy import select

INITIAL_SPORTS = [
    {"name": "Basketball", "icon": "🏀"},
    {"name": "Soccer", "icon": "⚽"},
    {"name": "Tennis", "icon": "🎾"},
    {"name": "Padel", "icon": "🏸"},
    {"name": "Volleyball", "icon": "🏐"},
]

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        for sport_data in INITIAL_SPORTS:
            result = await session.execute(
                select(Sport).where(Sport.name == sport_data["name"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                session.add(Sport(name=sport_data["name"], icon=sport_data["icon"]))
        await session.commit()
    print("Database tables created and default sports seeded successfully.")

if __name__ == "__main__":
    asyncio.run(init_models())
