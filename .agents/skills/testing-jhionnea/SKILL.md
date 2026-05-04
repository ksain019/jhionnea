# Testing Jhionnea App

## Overview
Jhionnea is a Next.js 16 frontend + FastAPI backend deployed on Fly.io (backend) and devinapps.com (frontend static export).

## Deployed URLs
- **Frontend:** https://out-ilcqkkfi.devinapps.com/login
- **Backend API:** https://jhionnea-backend-vwboktzs.fly.dev
- **Backend Docs:** https://jhionnea-backend-vwboktzs.fly.dev/docs

## Devin Secrets Needed
- `FLY_API_TOKEN` — Fly.io API token for deployments (org-scoped)
- `OPENAI_API_KEY` — for AI chat and content generation features
- `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` — for Gmail integration

## Test Credentials
- **Boss account:** `katia` / `katia2025` (full access including System Monitor)
- **User account:** `stanley` / `stanley2025` (limited access, no System Monitor data)

## Key Testing Scenarios

### 1. Backend Warm Check
Before testing the frontend, verify the backend is warm:
```bash
curl -sf -w "\nHTTP %{http_code} in %{time_total}s\n" https://jhionnea-backend-vwboktzs.fly.dev/api/health
```
Expected: `{"status":"ok","app":"Jhionnea"}` in under 1 second. If it takes 20+ seconds, the Fly.io machine was cold — wait for it to warm up and retry.

### 2. Token Expiry Auto-Redirect
To test expired token handling:
1. Log in normally
2. Open browser console: `localStorage.setItem("jhionnea_token", "expired-fake-token")`
3. Navigate to any dashboard page (click sidebar link)
4. Should auto-redirect to `/login` — NOT show "Invalid credentials" error

The 401 handler is in `frontend/src/lib/api.ts` (lines 20-25).

### 3. Dark Mode Persistence
- Dark mode toggle is in the header (moon/sun icon button with title "Dark mode" or "Light mode")
- State stored in `localStorage` key `jhionnea-dark`
- Toggle dark mode, then navigate to a different page — dark mode should persist
- Implementation: `frontend/src/components/Header.tsx` (lines 23-49)

### 4. Sidebar Navigation
There are 15 sidebar modules:
1. Dashboard
2. Writing
3. Teaching
4. Content
5. Documents
6. Email
7. Business
8. Analytics
9. Generators (14 sub-tabs)
10. Files
11. Calendar
12. Notifications
13. Chat
14. System (boss-only data)
15. Settings

### 5. Search
The global search endpoint (`GET /api/search`) may return 500 errors — this is a known bug. Test with caution.

## Architecture Notes
- Frontend is a Next.js 16 static export (`output: "export"` in next.config). Pages are pre-rendered HTML + client-side JS.
- Backend uses SQLAlchemy async with SQLite at `/data/jhionnea.db` (mounted Fly.io volume).
- Playwright/Chromium is lazy-loaded in `backend/app/services/browser.py` — not included in Docker image. Browser features will fail gracefully if Chromium isn't installed.
- Keepalive: `frontend/src/components/Keepalive.tsx` pings backend every 4 minutes. GitHub Actions cron (`.github/workflows/keepalive.yml`) pings every 5 minutes.

## Common Issues
- **"Loading..." stuck on deployed frontend:** This can happen with Next.js 16 static export hydration. Rebuilding and redeploying the frontend usually fixes it.
- **Fly.io cold starts (20-30s):** The keepalive mechanisms prevent this, but if the GitHub Actions cron is disabled or the frontend isn't open, the backend may go cold on free tier.
- **Deploy from repo root fails:** Use `backend/` directory for `flyctl deploy`, or use the root-level `Dockerfile` + `fly.toml` that were added to support root deploys.
