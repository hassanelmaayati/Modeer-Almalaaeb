from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict

# --- Auth Schemas ---
class UserSignup(BaseModel):
    name: str
    email: str
    password: str
    sports_interests: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"

# --- User Schemas ---
class UserOut(BaseModel):
    id: int
    name: str
    email: str
    profile_picture_url: Optional[str] = None
    sports_interests: Optional[str] = None
    rating_average: float
    rating_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    sports_interests: Optional[str] = None
    profile_picture_url: Optional[str] = None

class UserPublic(BaseModel):
    id: int
    name: str
    profile_picture_url: Optional[str] = None
    sports_interests: Optional[str] = None
    rating_average: float
    rating_count: int

    model_config = ConfigDict(from_attributes=True)

# --- Sport Schemas ---
class SportOut(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Rating Schemas ---
class RatingCreateItem(BaseModel):
    rated_user_id: int
    score: int # 1 to 5
    tags: Optional[str] = None

class RatingBatchCreate(BaseModel):
    ratings: List[RatingCreateItem]

class RatingOut(BaseModel):
    id: int
    room_id: int
    rater_id: int
    rated_user_id: int
    score: int
    tags: Optional[str] = None
    created_at: datetime
    rater_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserRatingSummary(BaseModel):
    user_id: int
    rating_average: float
    rating_count: int
    ratings: List[RatingOut]

# --- Participant Schemas ---
class ParticipantOut(BaseModel):
    id: int
    room_id: int
    team_id: Optional[int] = None
    user_id: int
    slot_number: Optional[int] = None
    role: str
    is_ready: bool
    user: UserPublic

    model_config = ConfigDict(from_attributes=True)

# --- Team Schemas ---
class TeamOut(BaseModel):
    id: int
    room_id: int
    name: str
    color: Optional[str] = None
    slot_count: int
    participants: List[ParticipantOut] = []

    model_config = ConfigDict(from_attributes=True)

class TeamCreate(BaseModel):
    name: str
    color: Optional[str] = None
    slot_count: int

# --- Room Schemas ---
class RoomCreate(BaseModel):
    sport_id: int
    name: str
    format: str # e.g., "5v5"
    team_count: int = 2
    max_players_per_team: int = 5
    location_text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    start_time: datetime
    skill_level: str = "All Levels"
    is_private: bool = False
    room_code: Optional[str] = None
    join_mode: str = "open" # "open" or "approval_required"
    teams: Optional[List[TeamCreate]] = None

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    location_text: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    start_time: Optional[datetime] = None
    skill_level: Optional[str] = None
    is_private: Optional[bool] = None
    room_code: Optional[str] = None
    join_mode: Optional[str] = None

class RoomOut(BaseModel):
    id: int
    host_id: int
    sport_id: int
    name: str
    format: str
    team_count: int
    max_players_per_team: int
    location_text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    start_time: datetime
    skill_level: str
    status: str
    is_private: bool
    room_code: Optional[str] = None
    join_mode: str
    created_at: datetime
    host: UserPublic
    sport: SportOut
    teams: List[TeamOut] = []
    current_player_count: int = 0
    max_player_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class RoomJoinRequest(BaseModel):
    team_id: Optional[int] = None
    slot_number: Optional[int] = None

# --- Join Request Schemas ---
class JoinRequestCreate(BaseModel):
    team_id: Optional[int] = None
    slot_number: Optional[int] = None

class JoinRequestOut(BaseModel):
    id: int
    room_id: int
    user_id: int
    team_id: Optional[int] = None
    slot_number: Optional[int] = None
    status: str
    created_at: datetime
    user: UserPublic

    model_config = ConfigDict(from_attributes=True)

class JoinRequestResolve(BaseModel):
    status: str # "accepted" or "declined"

# --- Chat Message Schema ---
class ChatMessageOut(BaseModel):
    id: int
    room_id: int
    user_id: int
    message: str
    created_at: datetime
    user: UserPublic

    model_config = ConfigDict(from_attributes=True)
