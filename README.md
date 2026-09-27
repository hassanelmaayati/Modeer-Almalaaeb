# Modeer Almalaaeb

## Problem Statement

Community recreational sports in Bahrain currently suffer from a central coordination problem. Organizing pickup basketball, soccer, tennis, or padel games across local spots like Manama, Riffa, or Muharraq relies on fragmented WhatsApp groups, word-of-mouth, or scattered social media posts.

This project brings online video game lobby mechanics to physical pickup sports by creating a real-time web application tailored for the local Bahrain community. Players select a sport, browse open local game lobbies, and claim specific team slots in real time. Game hosts retain full administrative control to modify venue details, balance teams, remove inactive players, lock lobbies, and launch matches. To build trust between players who may not know each other, the platform also introduces host-controlled join approval and a post-game rating system, allowing hosts to review a player's profile and reputation before accepting them into a game.

The core technical deliverable is a stateful, real-time platform built with a React frontend, a FastAPI backend using native WebSockets, and a PostgreSQL database. Built specifically to handle high concurrency, the application solves critical real-time engineering challenges: preventing race conditions when players attempt to claim the same open slot simultaneously, enforcing host-only authorization across persistent WebSocket connections, and managing seamless host migration to transfer lobby leadership if a creator disconnects mid-session.

## Objectives

- Design and build a full-stack web application enabling users to discover, create, and join community sports games in real time.
- Implement a lobby-style room system with team/slot selection, analogous to multiplayer game lobbies.
- Implement host controls with live authorization enforcement over WebSocket connections.
- Handle real-world concurrency issues (simultaneous slot claims, host disconnection) with correct, tested solutions.
- Deliver a deployed, demoable product with a clean, responsive UI.
- Implement a reputation system (profiles, ratings, host-approved joins) to build trust between players.

## User Stories

### Sport Selection & Discovery
- As a user, I want to select a sport from a list, so I can browse games specific to that sport.
- As a user, I want to see a live list of open rooms for my chosen sport, so I can find a game to join.
- As a user, I want to filter rooms by skill level, format, distance, and time, so I only see relevant games.
- As a user, I want the room list to update live as rooms fill up or new ones are created, so I always see current availability.

### Room Creation (Host)
- As a user, I want to create a room by choosing sport, format, team structure, location, and time, so others can find and join my game.
- As a host, I want to set my room as public or private (with a shareable code), so I can control who can join.
- As a host, I want to be automatically assigned host privileges over the room I create.

### Join Approval
- As a host, I want to require approval before players join my room, so I can vet who plays.
- As a host, I want to view a requesting player's profile, photo, and rating history before accepting them, so I can make an informed decision.
- As a host, I want to accept or decline a join request, with the requester notified immediately.
- As a user, I want to see the status of my join request (pending/accepted/declined) in real time.

### Joining a Room
- As a user, I want to view a room's team layout before joining, so I can decide which team/slot to pick.
- As a user, I want to claim a specific open slot on a team, so I know exactly where I stand in the game.
- As a user, I want to be notified immediately if a slot I tried to claim was just taken by someone else, so I can pick another one.
- As a user, I want to leave a slot I've joined, freeing it up for someone else in real time.

### In-Room Experience
- As a participant, I want to mark myself as "ready," visible live to everyone in the room.
- As a participant, I want to chat with others in the room, so we can coordinate details.
- As a participant, I want to see host information and room status (open/locked/in progress) at all times.

### Ratings
- As a host, I want to rate players after a completed game, so future hosts can see their reliability and skill.
- As a user, I want to see my own rating average and history on my profile.
- As a host reviewing a join request, I want to see a player's rating average and number of games played, so I can judge their trustworthiness.

### Profile Photos
- As a user, I want to upload a profile picture, so other players can recognize me.
- As a user, I want to see other players' profile pictures when viewing a room or a join request.

### Host Controls
- As a host, I want to edit the room's location and time, with changes reflected live for all participants.
- As a host, I want to move a player between teams/slots, so I can balance teams.
- As a host, I want to kick a disruptive or inactive player from the room.
- As a host, I want to lock the room to prevent further joins once teams are set.
- As a host, I want to start the match, changing the room's status for all participants.
- As a host, I want to cancel the room entirely, notifying all participants immediately.
- As a host, I want to transfer host privileges to another participant.

### Reliability
- As a user, if the host disconnects, I want the system to automatically promote a new host after a short grace period, so the room doesn't become stuck.
- As a user, I want my connection to automatically recover if my WebSocket connection drops, so I don't lose sync with the room.

### Profile
- As a user, I want a profile with my name, avatar, and sports interests, so others can see who they're playing with.
- As a user, I want to view my upcoming and past rooms.

## API Routes

### REST Endpoints — Auth

| Method | Route | Description |
|---|---|---|
| POST | `/auth/signup` | Register a new user |
| POST | `/auth/login` | Log in and receive tokens |
| POST | `/auth/refresh` | Refresh an access token |

### REST Endpoints — Users

| Method | Route | Description |
|---|---|---|
| GET | `/users/me` | Get current user's profile |
| PATCH | `/users/me` | Update current user's profile |
| GET | `/users/{id}` | Get a user's public profile |
| GET | `/users/{id}/ratings` | Get a user's rating summary |
| POST | `/users/me/avatar` | Upload/update profile picture |

### REST Endpoints — Sports

| Method | Route | Description |
|---|---|---|
| GET | `/sports` | List available sports |

### REST Endpoints — Rooms

| Method | Route | Description |
|---|---|---|
| GET | `/rooms?sport_id=&skill_level=&format=&near=&radius=&status=` | Browse/filter rooms |
| POST | `/rooms` | Create a new room |
| GET | `/rooms/{id}` | Get room details |
| PATCH | `/rooms/{id}` | Edit room (host only) |
| DELETE | `/rooms/{id}` | Cancel room (host only) |
| POST | `/rooms/{id}/join` | Join a room (open join mode) |

### REST Endpoints — Join Requests

| Method | Route | Description |
|---|---|---|
| POST | `/rooms/{id}/join-requests` | Request to join (approval-required rooms) |
| GET | `/rooms/{id}/join-requests` | List pending requests (host only) |
| PATCH | `/rooms/{id}/join-requests/{request_id}` | Accept/decline a request (host only) |

### REST Endpoints — Ratings

| Method | Route | Description |
|---|---|---|
| POST | `/rooms/{id}/ratings` | Submit player ratings after game completion (host) |

### WebSocket Route

| Route | Description |
|---|---|
| `WS /ws/rooms/{room_id}?token={jwt}` | Real-time connection for a room |

#### Client → Server Messages

| Message | Payload | Notes |
|---|---|---|
| `join_slot` | `{ team_id, slot_number }` | Open join mode |
| `leave_slot` | `{}` | |
| `toggle_ready` | `{}` | |
| `send_chat` | `{ message }` | |
| `request_join` | `{ team_id?, slot_number? }` | Used instead of `join_slot` when approval required |
| `edit_room` | `{ location?, start_time? }` | Host only |
| `move_player` | `{ user_id, target_team_id, target_slot }` | Host only |
| `kick_player` | `{ user_id }` | Host only |
| `lock_room` | `{}` | Host only |
| `start_match` | `{}` | Host only |
| `cancel_room` | `{}` | Host only |
| `transfer_host` | `{ user_id }` | Host only |

#### Server → Client Messages

| Message | Payload | Notes |
|---|---|---|
| `room_state` | full snapshot | Sent on connect/reconnect |
| `slot_taken` | `{ team_id, slot_number, user }` | |
| `slot_freed` | `{ team_id, slot_number }` | |
| `ready_changed` | `{ user_id, is_ready }` | |
| `room_updated` | `{ changed_fields }` | |
| `player_kicked` | `{ user_id }` | |
| `host_changed` | `{ new_host_id }` | |
| `room_status_changed` | `{ status }` | |
| `chat_message` | `{ user_id, message, timestamp }` | |
| `join_request_received` | `{ request_id, user }` | Sent to host only |
| `join_request_resolved` | `{ request_id, status }` | Sent to requester |
| `error` | `{ code, message }` | e.g. `slot_already_taken` |

## Entity-Relationship Diagram

### `users`
`id` (PK), `name`, `email` (unique), `password_hash`, `profile_picture_url`, `rating_average`, `rating_count`, `created_at`

### `sports`
`id` (PK), `name`

### `rooms`
`id` (PK), `host_id` (FK → users.id), `sport_id` (FK → sports.id), `name`, `format`, `team_count`, `max_players_per_team`, `location_text`, `lat`, `lng`, `start_time`, `skill_level`, `status` (open/locked/in_progress/completed/cancelled), `is_private`, `room_code`, `join_mode` (open/approval_required), `created_at`

### `teams`
`id` (PK), `room_id` (FK → rooms.id), `name`, `color`, `slot_count`

### `participants`
`id` (PK), `room_id` (FK → rooms.id), `team_id` (FK → teams.id, nullable), `user_id` (FK → users.id), `slot_number`, `role` (host/co_host/player/spectator), `is_ready`, `joined_at`
Unique constraints: `(room_id, user_id)`; `(team_id, slot_number)`

### `join_requests`
`id` (PK), `room_id` (FK → rooms.id), `user_id` (FK → users.id), `team_id` (FK → teams.id, nullable), `slot_number` (nullable), `status` (pending/accepted/declined), `created_at`
Unique constraint: `(room_id, user_id)`

### `ratings`
`id` (PK), `room_id` (FK → rooms.id), `rater_id` (FK → users.id), `rated_user_id` (FK → users.id), `score` (1–5), `tags` (nullable), `created_at`
Unique constraint: `(room_id, rater_id, rated_user_id)`

### `chat_messages` *(optional, if persisting chat history)*
`id` (PK), `room_id` (FK → rooms.id), `user_id` (FK → users.id), `message`, `created_at`

**Relationships summary:** One user can host many rooms. One room belongs to one sport and has many teams. One team has many participants via numbered slots. One user can participate in many rooms, but only once per room, enforced by a unique constraint. Join requests and ratings each link a user to a specific room, also with per-room uniqueness constraints to prevent duplicates.

## Descriptive Initial Wireframes

**Screen 1 — Sport Select**
A grid of tappable sport tiles (icon and name): Basketball, Soccer, Tennis, Padel, Volleyball, etc. Tapping a tile navigates to that sport's lobby browser. A search bar sits above the grid.

**Screen 2 — Lobby Browser**
Header shows the selected sport and a "Create Room" button. Below, a filter bar (skill level, format, distance, time). The main area is a vertical list of room cards, each showing room name, host avatar and name, location, start time, format badge (e.g. "5v5"), fill indicator ("7/10 players"), status badge (Open/Starting Soon/Full), and a lock icon for private rooms. Cards update live as rooms fill or new ones appear.

**Screen 3 — Room Lobby**
Top bar shows room name, sport icon, status badge, host avatar with a crown icon, and start time/location. The main area splits into team panels side by side, each listing numbered slots: filled slots show the player's avatar, name, and a ready checkmark; empty slots show a "Join" button, or a "Request to Join" button if the room requires approval. A chat panel sits alongside or below the teams. A "Ready Up" toggle sits in the bottom action bar for the current user. If the current user is the host, a "Host Controls" button opens a management panel with editable location/time fields, per-player "Move to Team" and "Kick" controls, a pending join-requests list (with requester photo, name, and rating shown for review), "Lock Room," "Start Match," "Cancel Room," and "Transfer Host" options.

**Screen 4 — Create Room**
A form for sport (pre-filled), room name, format selector, location input, date/time picker, skill level, and a public/private toggle (private reveals a generated room code). A "Require approval to join" toggle is included, with brief helper text explaining that the host will manually review each request. Submitting creates the room and takes the creator directly into Screen 3 as host.

**Screen 5 — Profile**
Avatar (tappable to upload/change a profile picture), name, sports interests, star rating average, and total games played. Tabs for "Upcoming Rooms" and "Past Rooms" list compact room cards linking back to Screen 3 or a read-only summary for completed rooms.

**Screen 6 — Post-Game Rating**
Shown automatically when a host marks a room as completed, or accessible from "Past Rooms." Lists all participants with a 1–5 star selector and optional quick tags per player, plus a "Submit Ratings" button that can be dismissed if the host doesn't want to rate.
