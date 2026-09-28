import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.init_db import init_models
from backend.app.database import engine, Base

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await init_models()

@pytest.mark.asyncio
async def test_root():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/")
        assert response.status_code == 200
        assert response.json()["message"] == "Modeer Almalaaeb API is running"

@pytest.mark.asyncio
async def test_sports_list():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/sports")
        assert response.status_code == 200
        sports = response.json()
        assert len(sports) >= 5
        sport_names = [s["name"] for s in sports]
        assert "Basketball" in sport_names
        assert "Soccer" in sport_names

@pytest.mark.asyncio
async def test_auth_and_user_flow():
    uid = str(uuid.uuid4())[:8]
    host_email = f"host_{uid}@example.com"
    player_email = f"player_{uid}@example.com"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Signup Host
        signup_res = await ac.post("/auth/signup", json={
            "name": "Host User",
            "email": host_email,
            "password": "password123",
            "sports_interests": "Basketball, Soccer"
        })
        assert signup_res.status_code == 200
        data = signup_res.json()
        assert "access_token" in data
        assert data["user"]["email"] == host_email
        host_token = data["access_token"]
        host_id = data["user"]["id"]

        # Get me
        me_res = await ac.get("/users/me", headers={"Authorization": f"Bearer {host_token}"})
        assert me_res.status_code == 200
        assert me_res.json()["name"] == "Host User"

        # Signup Player
        player_signup = await ac.post("/auth/signup", json={
            "name": "Player One",
            "email": player_email,
            "password": "password123"
        })
        assert player_signup.status_code == 200
        player_token = player_signup.json()["access_token"]
        player_id = player_signup.json()["user"]["id"]

        # Get public profile
        pub_res = await ac.get(f"/users/{player_id}")
        assert pub_res.status_code == 200
        assert pub_res.json()["name"] == "Player One"

        # Create room
        sports_res = await ac.get("/sports")
        bball_id = [s["id"] for s in sports_res.json() if s["name"] == "Basketball"][0]

        create_room_res = await ac.post("/rooms", json={
            "sport_id": bball_id,
            "name": "Friday Pickup Ball",
            "format": "5v5",
            "team_count": 2,
            "max_players_per_team": 5,
            "location_text": "Manama Sports Club",
            "start_time": "2026-10-01T18:00:00",
            "skill_level": "Intermediate",
            "join_mode": "open"
        }, headers={"Authorization": f"Bearer {host_token}"})
        assert create_room_res.status_code == 200
        room_data = create_room_res.json()
        room_id = room_data["id"]
        assert room_data["name"] == "Friday Pickup Ball"
        assert len(room_data["teams"]) == 2

        # Player joins room
        team_b_id = room_data["teams"][1]["id"]
        join_res = await ac.post(f"/rooms/{room_id}/join", json={
            "team_id": team_b_id,
            "slot_number": 1
        }, headers={"Authorization": f"Bearer {player_token}"})
        assert join_res.status_code == 200

        # Host submits ratings
        ratings_res = await ac.post(f"/rooms/{room_id}/ratings", json={
            "ratings": [
                {"rated_user_id": player_id, "score": 5, "tags": "Great teamwork"}
            ]
        }, headers={"Authorization": f"Bearer {host_token}"})
        assert ratings_res.status_code == 200

        # Get player ratings summary
        player_ratings = await ac.get(f"/users/{player_id}/ratings")
        assert player_ratings.status_code == 200
        assert player_ratings.json()["rating_average"] == 5.0
