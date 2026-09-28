# How to Run Modeer Almalaaeb Locally

This guide explains step-by-step how to run **Modeer Almalaaeb** on your local machine using VS Code or your terminal.

---

## Prerequisites

1. **Python 3.10+** installed
2. **Node.js 18+** & **npm** installed
3. **PostgreSQL** database running locally (or via Docker)

---

## Step 1: Set Up the PostgreSQL Database

Make sure PostgreSQL is running on your machine, then create the database and user:

```bash
# In psql or PostgreSQL client:
CREATE DATABASE modeer_almalaaeb;
CREATE USER modeer_user WITH PASSWORD 'modeer_pass';
GRANT ALL PRIVILEGES ON DATABASE modeer_almalaaeb TO modeer_user;
GRANT ALL ON SCHEMA public TO modeer_user;
```

> **Note:** If you want to use a different database URL, set the environment variable:
> `export DATABASE_URL="postgresql+asyncpg://<user>:<password>@localhost:<port>/<dbname>"`

---

## Step 2: Set Up and Start the Backend

Open a terminal in VS Code at the project root (`Modeer-Almalaaeb`):

```bash
# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Initialize database tables and seed sports data
PYTHONPATH=. python3 -m backend.init_db

# 3. Start the FastAPI backend server
PYTHONPATH=. uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend server will be live at `http://localhost:8000`.

---

## Step 3: Set Up and Start the Frontend

Open a **second terminal window** in VS Code:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install npm dependencies
npm install

# 3. Start the Vite React development server
npm run dev
```

The frontend will be live at **`http://localhost:3000`** (or `http://localhost:5173`).

---

## Step 4: Open in Your Browser & Test!

1. Open **`http://localhost:3000`** in your browser.
2. Click **Sign In** -> **Sign Up** to create an account.
3. Select a sport (e.g. **Basketball** or **Padel**).
4. Click **Create New Room** or join an existing open lobby.
5. Open a second browser tab (or incognito window) with a different account to test real-time WebSocket slot claims and lobby chat!

---

## Running Automated Tests

To run the backend test suite:

```bash
PYTHONPATH=. pytest backend/tests/ -v
```
