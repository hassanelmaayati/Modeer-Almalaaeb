from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, UniqueConstraint, Text
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    profile_picture_url = Column(String, nullable=True)
    sports_interests = Column(String, nullable=True) # Comma-separated or text
    rating_average = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    hosted_rooms = relationship("Room", back_populates="host", foreign_keys="Room.host_id")
    participants = relationship("Participant", back_populates="user", cascade="all, delete-orphan")
    join_requests = relationship("JoinRequest", back_populates="user", cascade="all, delete-orphan")
    given_ratings = relationship("Rating", foreign_keys="Rating.rater_id", back_populates="rater")
    received_ratings = relationship("Rating", foreign_keys="Rating.rated_user_id", back_populates="rated_user")


class Sport(Base):
    __tablename__ = "sports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    icon = Column(String, nullable=True)

    rooms = relationship("Room", back_populates="sport")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    name = Column(String, nullable=False)
    format = Column(String, nullable=False) # e.g. "5v5", "1v1", "2v2"
    team_count = Column(Integer, default=2)
    max_players_per_team = Column(Integer, default=5)
    location_text = Column(String, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    start_time = Column(DateTime, nullable=False)
    skill_level = Column(String, nullable=False, default="All Levels") # e.g. "Beginner", "Intermediate", "Advanced", "All Levels"
    status = Column(String, nullable=False, default="open") # open, locked, in_progress, completed, cancelled
    is_private = Column(Boolean, default=False)
    room_code = Column(String, nullable=True)
    join_mode = Column(String, nullable=False, default="open") # open, approval_required
    created_at = Column(DateTime, default=datetime.utcnow)

    host = relationship("User", back_populates="hosted_rooms", foreign_keys=[host_id])
    sport = relationship("Sport", back_populates="rooms")
    teams = relationship("Team", back_populates="room", cascade="all, delete-orphan", order_by="Team.id")
    participants = relationship("Participant", back_populates="room", cascade="all, delete-orphan")
    join_requests = relationship("JoinRequest", back_populates="room", cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="room", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    name = Column(String, nullable=False) # e.g. "Team A", "Team B"
    color = Column(String, nullable=True) # e.g. "#EF4444", "#3B82F6"
    slot_count = Column(Integer, nullable=False)

    room = relationship("Room", back_populates="teams")
    participants = relationship("Participant", back_populates="team", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    slot_number = Column(Integer, nullable=True)
    role = Column(String, nullable=False, default="player") # host, co_host, player, spectator
    is_ready = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("room_id", "user_id", name="uq_participant_room_user"),
        UniqueConstraint("team_id", "slot_number", name="uq_participant_team_slot"),
    )

    room = relationship("Room", back_populates="participants")
    team = relationship("Team", back_populates="participants")
    user = relationship("User", back_populates="participants")


class JoinRequest(Base):
    __tablename__ = "join_requests"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    slot_number = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="pending") # pending, accepted, declined
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("room_id", "user_id", name="uq_join_request_room_user"),
    )

    room = relationship("Room", back_populates="join_requests")
    user = relationship("User", back_populates="join_requests")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    rater_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rated_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, nullable=False) # 1-5
    tags = Column(String, nullable=True) # e.g. "Punctual, Team Player"
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("room_id", "rater_id", "rated_user_id", name="uq_rating_room_rater_rated"),
    )

    room = relationship("Room", back_populates="ratings")
    rater = relationship("User", foreign_keys=[rater_id], back_populates="given_ratings")
    rated_user = relationship("User", foreign_keys=[rated_user_id], back_populates="received_ratings")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="chat_messages")
    user = relationship("User")
