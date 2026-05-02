# Jhionnea — Private AI Employee System

A private, role-based AI employee system designed for automated writing, publishing, teaching, content operations, business management, and analytics.

## Users

- **Katia** (Boss): Full control, all permissions
- **Stanley** (User): Full access, no administrative settings

## Architecture

- **Frontend**: Next.js (App Router) + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Auth**: JWT-based with role-based access control

## Quick Start

### Backend

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Default Credentials

| User    | Username  | Password      | Role  |
|---------|-----------|---------------|-------|
| Katia   | katia     | katia2025     | Boss  |
| Stanley | stanley   | stanley2025   | User  |

## Modules

1. **Writing & Publishing** — Novels, workbooks, episodes, scripts
2. **Teaching & Curriculum** — Curricula, lesson plans, grading
3. **Content & Calendar** — Unified content calendar, platform drafts
4. **Business & Money** — Income tracking, bills, credit monitoring
5. **Investing & Sports Analytics** — Watchlist, trade logs, sports analysis

## API Documentation

When the backend is running, visit `http://localhost:8000/docs` for interactive API docs.
