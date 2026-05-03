# Testing Jhionnea App

## Overview
Jhionnea is a private AI employee system built with Next.js 16 frontend and FastAPI backend. It has 9 modules: Dashboard, Writing, Teaching, Content, Documents, Email, Business, Analytics, Chat.

## Starting the Servers

```bash
# Backend (from repo root)
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend (from repo root)
cd frontend && npm run dev -- -p 3000
```

- Backend: http://localhost:8000 (Swagger docs at /docs)
- Frontend: http://localhost:3000

## Devin Secrets Needed
No external secrets are required for local testing. The app uses local SQLite and built-in auth.

## Test Credentials
- **Boss**: `katia` / `katia2025` (full admin access)
- **User**: `stanley` / `stanley2025` (standard access)

## Database
- SQLite at `backend/jhionnea.db` (relative to where uvicorn runs)
- Delete this file to reset to fresh state: `rm -f backend/jhionnea.db`
- **Important**: SQLAlchemy `create_all` does NOT alter existing tables. If model columns are added (e.g. new `file_name` field), you must delete the old DB and restart the server. Otherwise you'll get `sqlite3.OperationalError: table X has no column named Y`.
- The config uses `data_dir = "/data" if os.path.isdir("/data") else "."`, so locally the DB lands in the backend working directory, not the repo root.

## Seeding Test Data
The app seeds two users (katia, stanley) automatically on startup. Other data must be seeded via API:

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"katia","password":"katia2025"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Create a student
curl -s -X POST http://localhost:8000/api/teaching/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria Johnson","grade_level":"8th Grade","email":"maria@school.edu"}'
```

## Testing File Upload
- The upload endpoint is `POST /api/teaching/assignments/upload`
- It accepts multipart form data: `file` (required), `title` (optional, Form), `student_id` (optional, Form)
- Supported file types: PDF, DOCX, TXT
- Text extraction uses `pypdf` for PDFs and `python-docx` for DOCX
- If no title is provided, it falls back to the filename without extension
- Create test files before testing:
  ```bash
  # TXT
  echo "Sample essay content for testing" > /tmp/test-essay.txt
  
  # PDF (requires fpdf2: pip install fpdf2)
  python -c "
  from fpdf import FPDF
  pdf = FPDF()
  pdf.add_page()
  pdf.set_font('Helvetica', 'B', 16)
  pdf.cell(0, 10, 'Test Homework')
  pdf.output('/tmp/test-homework.pdf')
  "
  ```
- Use Playwright CDP to set file inputs since drag-and-drop is hard to automate:
  ```javascript
  // Set file via CDP
  const result = await Runtime.evaluate({
    expression: 'document.querySelector("input[type=file]")',
    returnByValue: false
  });
  await DOM.setFileInputFiles({
    files: ['/tmp/test-essay.txt'],
    objectId: result.result.objectId
  });
  ```

## Testing Mobile Responsiveness
- Use CDP to set device metrics for mobile viewport:
  ```javascript
  await Emulation.setDeviceMetricsOverride({
    width: 375, height: 700, deviceScaleFactor: 1, mobile: true
  });
  ```
- To return to desktop: set width to 1024+ (don't use `clearDeviceMetricsOverride` as it may not reset properly)
- The `md:` Tailwind breakpoint is 768px. Below that = mobile, above = desktop.
- Mobile: hamburger icon in header, sidebar is slide-in overlay with dark backdrop
- Desktop: sidebar is permanent, no hamburger icon

## Common Issues
- **"Failed to fetch" on upload**: Usually means the backend returned a 500 error. Check backend terminal for the traceback. Common cause: stale DB missing new columns.
- **CORS**: Backend allows `http://localhost:3000` by default (configured in `app/config.py`). If the frontend is on a different port, update `JHIONNEA_CORS_ORIGINS` env var.
- **FastAPI Form params**: When using `UploadFile` with additional form fields, those fields MUST use `Form()` annotation (e.g., `title: str = Form("")`). Without it, FastAPI treats them as query params and ignores FormData values.
- **`chrome-remote-interface` npm module**: May need to be installed globally (`npm install -g chrome-remote-interface`) and used with `NODE_PATH=$(npm root -g)`.

## Lint & Build
```bash
# Backend
cd backend && ruff check . && ruff format --check .

# Frontend
cd frontend && npm run lint && npm run build
```

## Architecture Notes
- Next.js 16.2.4 with Turbopack — has breaking changes from older versions. Check `node_modules/next/dist/docs/` for guides.
- All pages use `"use client"` directive with React hooks (useState, useEffect).
- Sidebar state is managed via React Context (`SidebarContext` in `layout.tsx`).
- API client is in `frontend/src/lib/api.ts` — all endpoints go through `API_BASE` which defaults to `http://localhost:8000`.
