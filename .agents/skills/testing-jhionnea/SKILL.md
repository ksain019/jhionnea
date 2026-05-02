# Testing Jhionnea

## Overview
Jhionnea is a private AI employee system with Next.js frontend, FastAPI backend, SQLite DB, and Ollama LLM integration. Browser automation uses Playwright.

## Test Credentials
- **Boss:** `katia` / `katia2025` (full control)
- **User:** `stanley` / `stanley2025` (no admin)

## Setup

### Start Backend
```bash
cd /home/ubuntu/repos/jhionnea/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
```

### Start Frontend
```bash
cd /home/ubuntu/repos/jhionnea/frontend
npm run dev -- -p 3000 &
```

### Verify Health
```bash
curl -s http://localhost:8000/api/health
# Expected: {"status":"ok","app":"Jhionnea"}
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
# Expected: 200
```

### Ollama (for AI chat)
Ollama may need to be started separately:
```bash
ollama serve &
# Model: qwen2.5:3b (pull if needed: ollama pull qwen2.5:3b)
```

## Known Constraints

- **Ollama is slow with long conversation history.** The `_build_messages` function in `chat.py` retrieves last 10 messages as LLM context. With 6+ messages, response times can exceed 2 minutes on low-resource VMs. **Workaround:** Clear the DB (`rm -f backend/jhionnea.db`) and restart the backend to reset conversation history before testing.
- **Browser automation response time** is ~30-60s due to Playwright headless browser startup + Ollama processing.
- **"Browsed web" badge** only appears for new messages in the current session — it's not persisted in DB message history on page reload.
- **No CI configured** — tests are manual E2E via browser.

## Key Test Flows

### 1. Login + Dashboard
Login as katia → Dashboard should show "Welcome back, Katia!" with stats cards, no error banner.

### 2. Browser Navigation (positive test)
In Chat, send "Go to https://example.com" → Should show:
- Green "Browsed web" badge next to "Jhionnea"
- Screenshot card with globe icon + URL + rendered image
- "Click to expand" text

### 3. Normal Chat (negative test)
Send "Help me plan a new novel" → Should show writing help with NO browser badge and NO screenshot card.

### 4. Sidebar Navigation
Click all 7 sidebar links: Dashboard, Writing, Teaching, Content, Business, Analytics, Chat — all should load without errors.

### 5. Browser API Direct Test
```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"katia","password":"katia2025"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Test browser endpoint
curl -s -X POST http://localhost:8000/api/browser/action \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"action":"navigate","url":"https://example.com"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'success={d[\"success\"]}, title={d[\"title\"]}, has_screenshot={bool(d.get(\"screenshot_b64\"))}')"
# Expected: success=True, title=Example Domain, has_screenshot=True
```

## Tips
- Always clear the DB before browser automation tests if Ollama is slow
- Use the direct browser API endpoint (`/api/browser/action`) to verify Playwright works independently of Ollama
- The frontend runs on Next.js 16 with App Router — pages may show "Compiling..." briefly on first load
- Browser intent detection keywords: "go to", "open", "visit", "browse", "navigate to", "search for", "google", etc.

## Devin Secrets Needed
No secrets required for local testing. The app uses local Ollama (free) and SQLite.
