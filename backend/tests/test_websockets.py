import uuid
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from starlette.testclient import TestClient

from backend.app.main import app
from backend.init_db import init_models
from backend.app.database import engine, Base

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await init_models()

def test_websocket_flow_and_concurrency():
    uid = str(uuid.uuid4())[:8]
    host_email = f"wshost_{uid}@example.com"
    p1_email = f"wsp1_{uid}@example.com"
    p2_email = f"wsp2_{uid}@example.com"

    client = TestClient(app)

    # Signup users
    h_res = client.post("/auth/signup", json={"name": "WS Host", "email": host_email, "password": "pass"})
    p1_res = client.post("/auth/signup", json={"name": "WS Player 1", "email": p1_email, "password": "pass"})
    p2_res = client.post("/auth/signup", json={"name": "WS Player 2", "email": p2_email, "password": "pass"})

    host_token = h_res.json()["access_token"]
    p1_token = p1_res.json()["access_token"]
    p2_token = p2_res.json()["access_token"]

    # Get sport
    sports_res = client.get("/sports")
    sport_id = sports_res.json()[0]["id"]

    # Create room
    room_res = client.post("/rooms", json={
        "sport_id": sport_id,
        "name": "Padel Showdown",
        "format": "2v2",
        "team_count": 2,
        "max_players_per_team": 2,
        "location_text": "Riffa Padel Club",
        "start_time": "2026-10-02T20:00:00",
        "skill_level": "Advanced"
    }, headers={"Authorization": f"Bearer {host_token}"})
    room_data = room_res.json()
    room_id = room_data["id"]
    team_a_id = room_data["teams"][0]["id"]

    # Connect Host and Player 1 & 2
    with client.websocket_connect(f"/ws/rooms/{room_id}?token={host_token}") as ws_host:
        host_initial = ws_host.receive_json()
        assert host_initial["type"] == "room_state"

        with client.websocket_connect(f"/ws/rooms/{room_id}?token={p1_token}") as ws_p1:
            p1_initial = ws_p1.receive_json()
            assert p1_initial["type"] == "room_state"

            # Player 1 joins slot 2
            ws_p1.send_json({"type": "join_slot", "payload": {"team_id": team_a_id, "slot_number": 2}})

            # ws_p1 receives slot_taken and room_state
            p1_resp1 = ws_p1.receive_json()
            p1_resp2 = ws_p1.receive_json()
            types = {p1_resp1["type"], p1_resp2["type"]}
            assert "slot_taken" in types
            assert "room_state" in types

            # Player 1 non-host tries host command
            ws_p1.send_json({"type": "lock_room", "payload": {}})
            err = ws_p1.receive_json()
            assert err["type"] == "error"
            assert err["payload"]["code"] == "not_authorized"

            # Connect Player 2 and attempt to join same slot 2
            with client.websocket_connect(f"/ws/rooms/{room_id}?token={p2_token}") as ws_p2:
                p2_initial = ws_p2.receive_json()
                assert p2_initial["type"] == "room_state"

                ws_p2.send_json({"type": "join_slot", "payload": {"team_id": team_a_id, "slot_number": 2}})
                p2_err = ws_p2.receive_json()
                assert p2_err["type"] == "error"
                assert p2_err["payload"]["code"] == "slot_already_taken"
