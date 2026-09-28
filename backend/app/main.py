import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.routes import auth, users, sports, rooms, join_requests, ratings
from backend.app import websocket

app = FastAPI(
    title="Modeer Almalaaeb API",
    description="Real-Time Sports Lobby Management Backend API",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount avatar uploads directory
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(sports.router)
app.include_router(rooms.router)
app.include_router(join_requests.router)
app.include_router(ratings.router)
app.include_router(websocket.router)

@app.get("/")
async def root():
    return {"message": "Modeer Almalaaeb API is running"}
