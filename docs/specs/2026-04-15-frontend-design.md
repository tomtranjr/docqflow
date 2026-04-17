# DocQFlow Frontend Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Stack:** React 18 + Vite + Tailwind CSS + shadcn/ui + React Router
**Approach:** SPA served by FastAPI from single Docker container

---

## 1. Architecture

### Project Structure

```
docqflow/
  app.py                    # MINIMAL REFACTOR: routes become APIRouter
  classify.py               # UNTOUCHED
  server.py                 # NEW entrypoint: composes all routes, mounts static
  src/
    api/
      __init__.py
      routes.py             # APIRouter: /api/history, /api/stats, /api/search
      database.py           # aiosqlite + WAL mode + async write queue
      models.py             # Pydantic models for new endpoints
  frontend/
    package.json
    package-lock.json        # Committed for reproducible builds
    vite.config.ts           # Proxy /api -> localhost:8000 in dev
    tailwind.config.ts
    tsconfig.json
    index.html
    public/
    src/
      main.tsx
      App.tsx
      components/
        ui/                  # shadcn/ui primitives (Button, Badge, Table, Progress, etc.)
        layout/
          Shell.tsx           # App shell with top nav + main content area
          Header.tsx          # Top nav bar (56px), logo, nav links, theme dropdown
          ThemeToggle.tsx     # Light/dark/system dropdown in header
        upload/
          DropZone.tsx        # Drag-drop area with visual feedback
          FileList.tsx        # Queued/processing/completed file items
          BatchProgress.tsx   # Summary bar: "Processing 3 of 12 files"
        results/
          PredictionCard.tsx  # Inline result: filename, label pill, confidence badge
          ConfidenceBadge.tsx # Percentage + icon + color (accessible)
        feedback/
          Toast.tsx           # sonner integration for error/success notifications
          ErrorBoundary.tsx   # React Router errorElement wrapper
        shared/
          EmptyState.tsx      # Parameterized: icon + message + optional CTA
          SkeletonCard.tsx    # Loading skeleton matching PredictionCard dimensions
      pages/
        Classify.tsx          # Upload zone (top) + inline results (bottom)
        History.tsx           # Filterable, searchable, paginated table
        About.tsx             # Project info, team, architecture (lightweight)
        Settings.tsx          # Theme toggle (lightweight)
      context/
        UploadContext.tsx      # useReducer: ADD_FILES | SET_STATUS | SET_RESULT | CLEAR
        ThemeContext.tsx       # light | dark | system, syncs to localStorage
      hooks/
        useUpload.ts          # Consumes UploadContext, manages fetch fan-out
        useHistory.ts         # Fetches /api/history with pagination/filter params
      lib/
        api.ts                # Typed fetch wrapper for all /api/* endpoints
        types.ts              # PredictionResponse, UploadItem, HistoryEntry
        constants.ts          # API base URL, pagination defaults, file size limits
      styles/
        globals.css           # Tailwind directives, Public Sans import, CSS variables
  Dockerfile                  # Multi-stage: node:20-alpine build -> python:3.11-slim
  tests/
```

### Entrypoint Composition (server.py)

- Imports existing routes from `app.py` (refactored to APIRouter)
- Imports new routes from `src/api/routes.py`
- Creates single `FastAPI()` instance
- Registers all routers with `/api` prefix
- Loads model ONCE via dependency injection
- Mounts `StaticFiles(directory="frontend/dist", html=True)` at `/` LAST
- Dockerfile CMD: `uvicorn server:app --host 0.0.0.0 --port 8080`

### app.py Minimal Refactor

- Convert `app = FastAPI()` to `router = APIRouter()`
- Convert `@app.get(...)` to `@router.get(...)`
- Remove standalone model loading (moves to server.py DI)
- Existing endpoint logic stays identical
- Routes move from `/health`, `/predict` to `/api/health`, `/api/predict`

---

## 2. API Surface

### Existing Endpoints (moved to /api prefix)

| Endpoint | Method | Purpose | Changes |
|----------|--------|---------|---------|
| `/api/health` | GET | Service + model status | Path only |
| `/api/predict` | POST | Single PDF classification | Path only, also writes to history DB |

### New Endpoints

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/history` | GET | Paginated history | `?page=1&limit=25&label=&search=` | `{items: HistoryEntry[], total: int, page: int}` |
| `/api/history/{id}` | GET | Single classification detail | - | `HistoryEntry` |
| `/api/stats` | GET | Summary statistics | - | `{total: int, label_counts: {str: int}, recent_count_7d: int}` |

### Batch Upload Strategy

Client-side fan-out (no batch endpoint needed):
- Frontend sends N concurrent `fetch()` calls to `POST /api/predict`
- Limited to 3 concurrent requests to avoid overloading single-worker uvicorn
- Each file tracked independently in UploadContext reducer
- Results appear inline as each response arrives

---

## 3. Data Model

### SQLite Schema

```sql
CREATE TABLE classifications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    filename      TEXT NOT NULL,
    uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    label         TEXT NOT NULL,
    confidence    REAL NOT NULL,
    probabilities TEXT NOT NULL,  -- JSON string {"permit-3-8": 0.6, "not-permit-3-8": 0.4}
    text_preview  TEXT,           -- first 500 chars of extracted text
    file_size     INTEGER
);

CREATE INDEX idx_classifications_uploaded_at ON classifications(uploaded_at);
CREATE INDEX idx_classifications_label ON classifications(label);
```

### Persistence Details

- Database file: `data/docqflow.db` (configurable via `DOCQFLOW_DB_PATH` env var)
- Connection: `aiosqlite` with WAL mode enabled on creation
- Writes: async write queue (asyncio.Queue) to serialize concurrent writes
- Container ephemerality: acceptable for internal use; document volume mount for persistence

---

## 4. Pages & User Flows

### Classify Page (primary)

Layout:
- Top: drag-drop zone with upload icon, "Drop PDFs here or click to browse"
- First visit: only the drop zone visible, single context line below
- On file selection: file list appears below with per-file status indicators
- During processing: summary bar at top of results ("Processing 3 of 12 files")
- On completion: summary changes to "12 files classified - 10 permit-3-8, 2 not-permit-3-8"
- Results sorted by confidence ascending (lowest first = needs review)
- "Clear results" button to reset
- "Download CSV" button in summary bar for batch export

Per-file result card (compact, one line):
- Filename (truncated 40 chars, tooltip for full)
- Label pill (muted background)
- Confidence badge: percentage number + icon (checkmark/dash/warning triangle) + color
- Retry button on error

### History Page

- Search input above table (filters by filename)
- Dropdown filter by label ("All", "permit-3-8", "not-permit-3-8")
- Table columns: Filename | Date (relative, full on hover) | Classification | Confidence | Actions
- Row height: 48px, alternating subtle backgrounds
- Default sort: date descending
- Pagination: 25 per page, Previous/Next controls
- Empty state: "No classification history yet" + link to Classify page

### About Page

- Project description, pipeline overview, team members
- Static content, lightweight

### Settings Page

- Theme toggle: light / dark / system
- Minimal — this page exists for discoverability

---

## 5. Design System

### Color Tokens

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Primary | `#1B6EC2` | `#7EB3E8` | Buttons, links, active nav |
| Primary dark | `#0D3B66` | `#B8D4F0` | Header background, emphasis |
| Surface | `#FFFFFF` | `#0F172A` | Page background |
| Surface alt | `#F6F6F6` | `#1E293B` | Cards, table alt rows |
| Border | `#E0E0E0` | `#334155` | Dividers, card borders |
| Text primary | `#212121` | `#F1F5F9` | Body text |
| Text secondary | `#757575` | `#94A3B8` | Labels, captions |
| Success | `#2E8540` | `#4ADE80` | High confidence badge |
| Warning | `#E6A817` | `#FBBF24` | Medium confidence badge |
| Error | `#CD2026` | `#F87171` | Low confidence badge, errors |

### Typography

- Font: `"Public Sans", system-ui, sans-serif` via `@fontsource/public-sans`
- Scale: 14px body, 16px emphasis, 20px page titles, 24px hero, 12px captions
- Weight: 400 regular, 600 semibold, 700 bold (headings)

### Spacing & Layout

- Base unit: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64
- Border radius: `0.125rem` (2px) globally — civic/government aesthetic
- No box shadows on cards — use 1px border only
- Top nav height: 56px, sticky
- Max content width: 1200px, centered
- Page padding: 24px horizontal, 32px vertical

### shadcn/ui Overrides

- `--radius: 0.125rem` (nearly square, not rounded)
- Card: remove shadow, add 1px border
- Badge variant: `outline` for lower visual weight
- Table: use directly, no wrapper
- Progress: use directly for BatchProgress

### Confidence Badge Design

Each tier uses icon + number + color (accessible without color):
- High (>80%): filled checkmark icon + green
- Medium (50-80%): dash/minus icon + amber
- Low (<50%): warning triangle icon + red

### Focus & Accessibility

- Focus ring: override `--ring` to high-contrast (#FFD700 on dark, #0D3B66 on light)
- DropZone drag-active: border changes from dashed to solid + color shift (not color alone)
- All text meets WCAG AA contrast ratios minimum
- Keyboard navigation tested across all interactive elements

---

## 6. Micro-Interactions

| Element | Interaction | Duration |
|---------|------------|----------|
| DropZone drag-over | Border: dashed->solid, bg: 4% primary tint | 150ms |
| File accepted | Checkmark fade-in, then spinner replaces | 100ms in, 400ms hold |
| Result card entry | Slide in from right | 200ms ease-out |
| Confidence fill | Badge fills 0% -> actual value | 300ms |
| Button loading | Spinner inside button, label: "Classifying..." | Immediate |
| Theme toggle | Instant, no transition (avoids flash) | 0ms |
| Table row hover | Subtle background highlight | 100ms |
| Toast notification | Slide in bottom-right, auto-dismiss 5s | 200ms in, 150ms out |

---

## 7. State Management

### UploadContext (useReducer)

```typescript
type UploadItem = {
  id: string
  file: File
  status: 'idle' | 'uploading' | 'done' | 'error'
  result?: PredictionResponse
  error?: string
}

type Action =
  | { type: 'ADD_FILES'; files: File[] }
  | { type: 'SET_STATUS'; id: string; status: UploadItem['status'] }
  | { type: 'SET_RESULT'; id: string; result: PredictionResponse }
  | { type: 'SET_ERROR'; id: string; error: string }
  | { type: 'CLEAR' }
```

### ThemeContext

- Stores `'light' | 'dark' | 'system'`
- Syncs to `localStorage` key `docqflow-theme`
- Applies class to `document.documentElement` (`dark` class for Tailwind dark mode)

### No global state library needed

React Context + useReducer covers both state domains. History data is fetched via `useHistory` hook with local component state (no global cache needed at this scale).

---

## 8. Docker Build (Multi-Stage)

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY app.py classify.py server.py ./
COPY src/ src/
COPY models/ models/
COPY --from=frontend-build /app/frontend/dist frontend/dist
EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## 9. Development Workflow

### Local Development

```bash
# Terminal 1: FastAPI backend
uvicorn server:app --reload --port 8000

# Terminal 2: Vite dev server
cd frontend && npm run dev
```

Vite proxies `/api/*` to `localhost:8000` via `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: { '/api': 'http://localhost:8000' }
  },
  base: '/'
})
```

### Production Build

```bash
cd frontend && npm run build   # outputs to frontend/dist/
docker build -t docqflow .     # multi-stage builds both
docker run -p 8080:8080 docqflow
```

---

## 10. Error Handling Strategy

| Error | Source | Frontend Handling |
|-------|--------|-------------------|
| 503 Model not loaded | `/api/predict` | Toast: "Model not loaded. Train the model first." |
| 422 Empty PDF | `/api/predict` | Toast: "No text found in {filename}. File may be scanned." |
| 413 File too large | Client-side | Inline error on DropZone: "File exceeds 20MB limit" |
| Non-PDF file | Client-side | Inline error on DropZone: "Only PDF files accepted" |
| Network error | fetch() | Toast: "Connection failed. Is the server running?" |
| Unknown error | Any | Error boundary catches, shows fallback UI |

### Client-Side Validation (before upload)

- File type: must be `.pdf` (check MIME type + extension)
- File size: max 20MB per file
- Reject immediately with inline feedback in DropZone

---

## 11. Navigation

Top nav bar, 56px, sticky:

```
[DocQFlow logo]    Classify    History    About    Settings    [Theme dropdown]
```

- Active item: underlined with primary blue, semibold text
- Logo: text wordmark "DocQFlow" in primary dark
- Mobile (<768px): hamburger menu
- Theme dropdown replaces Settings page theme toggle at narrow widths

---

## 12. Key Dependencies

### Frontend (package.json)

```
react, react-dom, react-router-dom
@fontsource/public-sans
tailwindcss, postcss, autoprefixer
class-variance-authority, clsx, tailwind-merge  (shadcn deps)
lucide-react                                     (icons)
sonner                                           (toast notifications)
```

### Backend (new additions to pyproject.toml)

```
aiosqlite    # async SQLite with WAL support
aiofiles     # static file serving
```

---

## 13. Out of Scope (for now)

- Model retraining from UI
- User authentication / roles
- MLflow metrics in frontend (MLflow UI handles this)
- PDF preview / viewer
- Multi-model support
- Cloud database (Firestore)
- SSR / Next.js
