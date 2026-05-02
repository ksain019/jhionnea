# Testing Jhionnea — Local E2E Testing Guide

## Environment Setup

### Start Backend
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
```
- Backend runs on `http://localhost:8000`
- Swagger docs at `http://localhost:8000/docs`
- Uses SQLite (`jhionnea.db`) — delete it for a fresh DB

### Start Frontend
```bash
cd frontend
npm run dev &
```
- Frontend runs on `http://localhost:3000`
- Uses Next.js 16.2.4 with Turbopack
- May take 10-15 seconds to compile on first load

## Devin Secrets Needed
No secrets required for local testing. The app uses local SQLite and template-based content generation.

## Login Credentials
- **Boss (Katia):** username=`katia`, password=`katia2025` — full permissions
- **User (Stanley):** username=`stanley`, password=`stanley2025` — no admin settings

## API Token for Data Seeding
When re-creating test data via API (e.g., after DB reset), get a token first:
```bash
TOKEN=$(curl -s http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"katia","password":"katia2025"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

## Module Testing Notes

### Teaching (`/dashboard/teaching`)
- 5 tabs: Overview, Students, Grading, Attendance, Sick Day Lessons
- Create student → create assignment → grade (PUT `/api/teaching/assignments/{id}/grade`) → analyze
- Grading endpoint is **PUT** not POST
- Demo lessons use template-based generation (no LLM needed)

### Content (`/dashboard/content`)
- 4 tabs: Calendar, YouTube, Podcast, Drafts
- YouTube project creation uses `project_type` field (not `video_type`)
- Valid project types: `cartoon`, `reel`, `educational_video`
- Script generation is template-based — produces INTRO/SEGMENT/OUTRO structure
- Podcast voice styles: `professional`, `casual`, `energetic`

### Documents (`/dashboard/documents`)
- Document types: paper, novel, essay, report, thesis, manuscript
- Format styles: apa, mla, chicago, custom
- Formatting is template-based — produces structured header + sections + footer
- Word count and page count are calculated server-side on creation

### Email (`/dashboard/email`)
- 3 tabs: Rules, Analyze Emails, History
- Rule types: delete, keep, archive, label
- Rule fields: from (sender), subject, body, label
- Email analysis format: `from | subject | body` (one per line, pipe-separated)
- Classification uses rule matching first, then built-in patterns (spam, school, meeting, etc.)

### Sidebar Navigation
- 9 modules: Dashboard, Writing, Teaching, Content, Documents, Email, Business, Analytics, Chat
- All routes under `/dashboard/*`

## Common Issues
- If frontend returns empty HTML on first request, wait 10+ seconds for Turbopack compilation
- DB is SQLite — delete `jhionnea.db` in backend dir for a clean slate
- Ollama/HuggingFace not required for testing — content generation uses templates as fallback
- Chat module may be slow if Ollama is running with large conversation history
