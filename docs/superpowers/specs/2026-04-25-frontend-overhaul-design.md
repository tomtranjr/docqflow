# DocQFlow Frontend Overhaul — Design Spec

**Date:** 2026-04-25
**Status:** Approved (post architect + devils-advocate review v2)
**Owner:** Lokesh Muvva
**Branch:** `feat/frontend-overhaul`
**Stack:** React 19 + Vite 8 + Tailwind 4 + React Router 7 (existing). Adds `react-pdf` (PR 1), `@tanstack/react-query` (PR 3), OpenAI Python SDK targeting Ollama (PR 2).

---

## 1. Goal

Overhaul the DocQFlow web app to match the supplied marketing mock: a single-document review workspace with a left marketing rail, top nav (Dashboard / Submissions / Reports / Settings), centered PDF viewer, right-hand extracted-fields panel with auto-classification card, action buttons (Confirm / Edit / Request More Info), and a 6-step process flow strip.

The PDF in the center pane is the user's actual upload. The "Extracted Fields" panel shows real LLM-derived fields (not mock data), each with a verifiable `source_text` snippet quoted from the document.

## 2. Non-goals (explicit out-of-scope)

- Authentication / multi-tenant. Reviewer identity is `localStorage`-only with a "self-reported" affordance in the UI.
- Multi-class classifier retraining. Binary classifier (`permit-3-8` vs `not-permit-3-8`) is unchanged. Department label comes from the LLM, not the classifier.
- PDF redaction / annotation tooling.
- Notifications via email or Slack on review status changes.
- Mobile-first redesign (responsive but desktop-first).
- Real-time collaboration / multi-user review of the same submission.
- Reviewer feedback feeding into classifier retraining (worth doing later, not in scope here).

## 3. Decisions captured during brainstorming

| # | Decision | Rationale |
|---|---|---|
| Q1 | Real LLM-driven field extraction (not mock, not rules-only) | Highest product value; appropriate for an MLOps course. |
| Q2 | LLM with content-hash cache (option D) | Bounded cost; resilient to slow / offline LLM box. |
| Q3 | Self-hosted Ollama via OpenAI-compatible API | User's friend hosts the LLM; OpenAI SDK works with custom `base_url`. |
| Q4 | Two-route IA: drop-1 → `/review/:id`, drop-N → `/queue` | Preserves batch workflow without diluting the single-doc design. |
| Q5 | Binary classifier *advises*, does not gate; LLM derives department label | Avoids silent false-negative failure mode caught in adversarial review. |
| Q6 | Real persistence for review actions (Confirm / Edit / Request More Info) | Turns the screen into a real review workflow. |
| Q7 | PDF.js (`react-pdf`), client-side, lazy-loaded on `/review/:id` | Custom toolbar is required; backend stays free of file-serving routes. |
| Q8 | Left marketing rail visible on Dashboard only | Workspace pages need full width for PDF + fields. |
| UX | Confidence percentages hidden by default, toggleable globally + per-page | Avoids treating soft predictions as ground truth. |
| UX | Extracted field "evidence" is `source_text` (verbatim quote), not `confidence` | LLM confidence floats are theater; source-text is verifiable. |

## 4. Architecture

### 4.1 PR sequence

| PR | Branch | Scope | Independent value |
|---|---|---|---|
| 1 | `feat/frontend-overhaul` | Frontend layout overhaul + minimal backend prerequisites: `id` in `/api/predict`, `documents` table + filesystem PDF storage, `GET /api/classifications/{id}/pdf`, `src/api/config.py` Settings module, schema_version migration runner. Placeholder extraction via `usePlaceholderExtraction()`. Action buttons disabled. | Mock-faithful UI ships with a real (placeholder-driven) review screen. |
| 2 | `feat/llm-extraction-backend` | Ollama-driven `/api/extract`, `LLMClient` Protocol + Ollama impl + `FakeLLMClient`, Pydantic schema, SHA-256 cache, in-flight request coalescing, LLM department label. | Real extraction working in isolation, CI-tested with FakeLLMClient. |
| 3 | `feat/wire-extraction` | Replace `usePlaceholderExtraction()` with `useExtraction` (TanStack Query). Loading / error / `not_found` (404) / `not_permit` (422) / `unavailable` (503) states. Manual "Extract anyway" override for misclassified docs. | End-to-end real extraction. |
| 4 | `feat/review-workflow` | Schema migration adds `review_status` / `review_notes` / `corrected_fields` / `reviewed_at` / `reviewed_by`. `PATCH /api/history/{id}/review`. Action buttons fully wired. Submissions status filter. Reports breakdown. | Full review workflow product. |

Each PR starts from latest `origin/main`, rebases before opening, and merges before the next opens. After PR N merges, an integration smoke test re-runs against PR N+1's branch (the merge-train gate).

### 4.2 End-state data flow

```
User drops PDF on /
  POST /api/predict (existing, extended in PR 1)
       returns: { id, label, probabilities, pdf_sha256 }
       persists: PDF bytes to data/pdfs/{sha256}.pdf
                 row in documents (sha256, size, created_at)
                 row in classifications (id, filename, label, ..., pdf_sha256)
  → if 1 file: navigate(`/review/${id}`)
  → if N files: parallel POST per file → navigate('/queue')

/review/:id mount
  GET /api/classifications/{id}                         metadata (label, sha, filename)
  GET /api/classifications/{id}/pdf                     streams from data/pdfs/{sha256}.pdf
  POST /api/extract/{id}                                PR 2; cache-first; advisory gate
       cache key: (pdf_sha256, prompt_version, model)
       if classifier label == permit-3-8: auto-trigger
       if not-permit: shows banner "Classifier says not a permit; click to extract anyway"
       in-flight requests for the same key are coalesced (one Ollama call, N awaiters)
       returns:
         {
           fields: { applicant_name: { value, source_text }, address: {...}, ... },
           department: "building" | "electrical" | "plumbing" | "zoning" | "other",
           department_confidence: float,
           model: "llama3.1:8b",
           prompt_version: 1
         }

Reviewer action
  PATCH /api/history/{id}/review                        PR 4
```

### 4.3 Invariants

1. `/api/predict` is **extended** in PR 1: response gains `id` and `pdf_sha256`. Existing fields (`label`, `probabilities`) are unchanged. Frontend bumps but no third-party clients exist today.
2. LLM call is never on the upload critical path. Upload → predict is fast and synchronous; extraction is fired on `/review/:id` mount with skeleton UI while it runs.
3. Cache key is `(sha256(pdf_bytes), prompt_version, model)`. Re-uploading the same file hits cache; bumping `EXTRACTION_PROMPT_VERSION` invalidates without an explicit migration. In-flight calls for the same key are coalesced.
4. Per-field `value: string | null` and `source_text: string | null` are the load-bearing UI signals. `null value` → MISSING badge. `null source_text` → "evidence unavailable" disclosure. Department-level `confidence` is shown only behind the toggle and never pretends to be a calibrated probability.
5. Ollama outage = degraded experience, not broken upload. Classifier still works, PDF still renders, panel shows "Extraction unavailable — try again later" with a Retry button.
6. Review status transitions are server-authoritative. Frontend optimistic updates roll back on PATCH failure.
7. PDF bytes live on the filesystem at `data/pdfs/{sha256}.pdf`, deduplicated by SHA-256. The `documents` table tracks them. The `classifications` table references `pdf_sha256`. No BLOB columns exist anywhere.
8. The classifier label **advises** the extraction trigger; it is not a hard gate. The user can always invoke extraction manually.

## 5. Frontend (PR 1) — Detailed

### 5.1 Routing

```ts
// frontend/src/App.tsx
const router = createBrowserRouter([
  {
    element: <DashboardShell />,
    errorElement: <ErrorBoundary />,
    children: [{ path: '/', element: <Dashboard /> }],
  },
  {
    element: <WorkspaceShell />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '/review/:id', element: <Review /> },
      { path: '/queue', element: <Queue /> },
      { path: '/submissions', element: <Submissions /> },
      { path: '/reports', element: <Reports /> },
      { path: '/settings', element: <Settings /> },
      { path: '/about', element: <About /> },
    ],
  },
])
```

`Classify.tsx` is deleted (logic absorbed by `Dashboard.tsx`). `History.tsx` is renamed `Submissions.tsx`. `About.tsx` becomes a footer-only link from the Dashboard.

### 5.2 Component inventory

**Layout**

| Component | File | Purpose |
|---|---|---|
| `TopBar` | `layout/TopBar.tsx` | Wordmark + tab nav + bell + avatar |
| `LeftRail` | `layout/LeftRail.tsx` | Brand block + 4 marketing tiles (Dashboard only) |
| `CollapsedNav` | `layout/CollapsedNav.tsx` | 64px icon-rail for non-dashboard pages |
| `ProcessFlowStrip` | `layout/ProcessFlowStrip.tsx` | 6-step horizontal flow; `activeStep` prop |
| `DashboardShell` | `layout/DashboardShell.tsx` | TopBar + LeftRail + Outlet + ProcessFlowStrip + Footer |
| `WorkspaceShell` | `layout/WorkspaceShell.tsx` | TopBar + CollapsedNav + Outlet |
| `Footer` | `layout/Footer.tsx` | About / GitHub links; rendered inside DashboardShell |

**Dashboard**

| Component | File | Purpose |
|---|---|---|
| `MarketingTile` | `dashboard/MarketingTile.tsx` | Icon + title + body |

**PDF**

| Component | File | Purpose |
|---|---|---|
| `PdfViewer` | `pdf/PdfViewer.tsx` | `react-pdf` wrapper, lazy-loaded |
| `PdfToolbar` | `pdf/PdfToolbar.tsx` | `< 1/N >` page nav, zoom in/out, download |

**Extraction**

| Component | File | Purpose |
|---|---|---|
| `ExtractedFieldsPanel` | `extraction/ExtractedFieldsPanel.tsx` | Header + list of `ExtractedFieldRow` + `ExtractedFieldRowSkeleton` while loading |
| `ExtractedFieldRow` | `extraction/ExtractedFieldRow.tsx` | Icon + label + value + MISSING flag + `source_text` disclosure |
| `ExtractedFieldRowSkeleton` | `extraction/ExtractedFieldRowSkeleton.tsx` | Loading placeholder matching row dimensions |
| `DepartmentCard` | `extraction/DepartmentCard.tsx` | LLM-derived department label + optional confidence |
| `ActionBar` | `extraction/ActionBar.tsx` | Confirm / Edit / Request More Info (disabled in PR 1, wired in PR 4) |
| `ExtractAnywayBanner` | `extraction/ExtractAnywayBanner.tsx` | Shown on /review/:id when classifier label == not-permit; clicking triggers manual extraction (live in PR 3) |
| `ErrorBanner` | `extraction/ErrorBanner.tsx` | Shared by `unavailable` and `error` states; includes Retry |

**Common**

| Component | File | Purpose |
|---|---|---|
| `ConfidenceToggle` | `common/ConfidenceToggle.tsx` | "Show confidence" pill in workspace header |
| `ClassificationBadge` | `common/ClassificationBadge.tsx` | Pill badge for `permit-3-8` / `not-permit-3-8`; reused by Queue + Submissions |
| `StatCard` | `common/StatCard.tsx` | Reusable card for Reports |

**Queue / Submissions / Reports**

| Component | File | Purpose |
|---|---|---|
| `QueueGrid` | `queue/QueueGrid.tsx` | Grid of session uploads |
| `QueueThumbnail` | `queue/QueueThumbnail.tsx` | First-page render (lazy `react-pdf`) + filename + `ClassificationBadge` |
| `SubmissionsTable` | `submissions/SubmissionsTable.tsx` | Restyled table with `ClassificationBadge` + (PR 4) `StatusBadge` |
| `ReportsCards` | `reports/ReportsCards.tsx` | Composes `StatCard`s from `/api/stats` |

**Pages**

| Page | Route | Notes |
|---|---|---|
| `Dashboard` | `/` | Empty drop zone in center; routes upload to `/review/:id` or `/queue` |
| `Review` | `/review/:id` | PDF + extraction panel + action bar |
| `Queue` | `/queue` | Multi-upload grid with thumbnails (lazy `react-pdf`) |
| `Submissions` | `/submissions` | Renamed `History`, restyled |
| `Reports` | `/reports` | Lightweight cards from `/api/stats` |
| `Settings` | `/settings` | Restyled; adds confidence-default toggle |
| `About` | `/about` | Footer link only |

### 5.3 Upload routing

```ts
// frontend/src/hooks/useUpload.ts (extension)
async function addAndProcess(files: File[]) {
  if (files.length === 1) {
    const result = await api.predict(files[0])  // returns { id, label, probabilities, pdf_sha256 }
    navigate(`/review/${result.id}`)
    return
  }
  const results = await Promise.all(files.map(api.predict))
  setQueueResults(results)
  navigate('/queue')
}
```

The `id` field in `PredictionResponse` is added in PR 1 (see §6.1).

### 5.4 State / context

- Rename `ThemeContext` → `PreferencesContext`. Holds `{ theme, showConfidence, reviewerName }`. All persist in `localStorage` keyed `docqflow.prefs`.
- Reader hooks split: `useTheme()`, `useShowConfidence()`, `useReviewerName()` so unrelated components don't re-render on adjacent changes.
- `UploadContext` keeps the existing reducer; gains `queueResults` only (no `currentReviewId` — that's `useParams().id` on `/review/:id`).
- TanStack Query (PR 3) replaces the proposed `ExtractionContext`. `queryKey: ['extraction', classificationId]` gives per-id caching, dedup, retry, and stale-time for free.

### 5.5 Design tokens

```css
/* frontend/src/styles/globals.css */
:root {
  --color-brand-primary: #0F2C5C;     /* navy from wordmark */
  --color-brand-accent:  #1F7AE0;     /* blue from wordmark */
  --color-surface-base:  #F7F8FA;
  --color-surface-elev1: #FFFFFF;
  --color-surface-elev2: #FFFFFF;
  --color-text-primary:  #0F172A;
  --color-text-muted:    #475569;
  --color-success:       #16A34A;
  --color-warning:       #D97706;
  --color-danger:        #DC2626;
  --color-confidence-high: #16A34A;
  --color-confidence-med:  #D97706;
  --color-confidence-low:  #DC2626;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06);
}

[data-theme="dark"] { /* dark-variant values */ }
```

### 5.6 Tests (PR 1)

- New unit tests:
  - `DashboardShell` renders LeftRail + ProcessFlowStrip; `WorkspaceShell` does not.
  - `LeftRail` renders 4 `MarketingTile`s.
  - `PdfToolbar` page nav and zoom buttons fire correct callbacks.
  - `ConfidenceToggle` reads / writes `PreferencesContext` and persists.
  - `useUpload`: 1-file routes to `/review/:id`, N-file routes to `/queue`.
  - `usePlaceholderExtraction()` returns the same shape as PR 3's `useExtraction` (locked by a shared TS type).
  - `ExtractedFieldRow`: MISSING state when value is null; `source_text` disclosure expands.
- Playwright smoke (via `e2e-runner` agent): upload one PDF on `/` → land on `/review/:id` → see PDF + placeholder panel with valid `usePlaceholderExtraction` data.
- CI bundle-size assertion: main chunk < 250 kB gzipped (`react-pdf` must lazy-load).

## 6. Backend (PR 1 prerequisites + PR 2 LLM extraction) — Detailed

### 6.1 PR 1 backend additions

**`/api/predict` extension.** `PredictionResponse` gains `id: int` (the autoincrement row id from `classifications`) and `pdf_sha256: str`. `app.py:predict_pdf` writes the PDF to `data/pdfs/{sha256}.pdf` (creating the directory if needed), inserts a `documents` row, and returns `cursor.lastrowid` from `save_classification`.

**New `documents` table** (PR 1 migration):

```sql
CREATE TABLE IF NOT EXISTS documents (
  sha256     TEXT PRIMARY KEY,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE classifications ADD COLUMN pdf_sha256 TEXT REFERENCES documents(sha256);
CREATE INDEX IF NOT EXISTS classifications_sha256_idx ON classifications(pdf_sha256);
```

**`GET /api/classifications/{id}/pdf`** (PR 1, new endpoint). Looks up the row, reads `data/pdfs/{pdf_sha256}.pdf`, streams as `application/pdf` with `Content-Disposition: inline; filename={original}`. 404 if not found, 410 (Gone) if `pdf_sha256` is NULL on a legacy row.

**`src/api/config.py` Settings module** (PR 1, new). Single source of truth for env vars:

```python
# src/api/config.py
from dataclasses import dataclass
import os

@dataclass(frozen=True)
class Settings:
    db_path:                  str
    pdf_dir:                  str
    llm_base_url:             str
    llm_api_key:              str
    llm_model:                str
    llm_timeout_seconds:      int
    extraction_prompt_version: int

def load_settings() -> Settings:
    return Settings(
        db_path=os.getenv("DOCQFLOW_DB_PATH", "data/docqflow.db"),
        pdf_dir=os.getenv("DOCQFLOW_PDF_DIR", "data/pdfs"),
        llm_base_url=os.getenv("LLM_BASE_URL", "http://host.docker.internal:11434/v1"),
        llm_api_key=os.getenv("LLM_API_KEY", "ollama"),
        llm_model=os.getenv("LLM_MODEL", "llama3.1:8b"),
        llm_timeout_seconds=int(os.getenv("LLM_TIMEOUT_SECONDS", "30")),
        extraction_prompt_version=int(os.getenv("EXTRACTION_PROMPT_VERSION", "1")),
    )
```

`database.py` migrates from inline `os.getenv` to `Settings.db_path` opportunistically in PR 1.

**`schema_version` migration runner** (PR 1, new). A trivial homegrown runner:

```python
# src/api/migrations.py
async def apply_migrations(db) -> None:
    await db.execute("CREATE TABLE IF NOT EXISTS schema_version (v INTEGER PRIMARY KEY)")
    cur = await db.execute("SELECT MAX(v) FROM schema_version")
    current = (await cur.fetchone())[0] or 0
    for version, sql in MIGRATIONS:
        if version > current:
            for stmt in sql:
                await db.execute(stmt)
            await db.execute("INSERT INTO schema_version (v) VALUES (?)", (version,))
    await db.commit()
```

`MIGRATIONS` is a versioned list of SQL statements. Initial migration (v1) creates the existing schema. PR 1 adds v2 (documents + pdf_sha256 column). PR 2 adds v3 (extractions cache table). PR 4 adds v4 (review_status / notes / corrected_fields / reviewed_at / reviewed_by columns).

`apply_migrations` runs once at server startup (replacing the existing `init_db` body).

### 6.2 PR 2 module structure

```
src/api/extraction/
  __init__.py
  models.py          # Pydantic: ExtractedField, ExtractionResult, FieldName, Department
  llm_client.py      # LLMClient Protocol + OllamaLLMClient impl + FakeLLMClient (test)
  prompts.py         # System + user prompt templates; PROMPT_VERSION constant
  parser.py          # Raw JSON string → ExtractionResult; robust to LLM quirks
  cache.py           # aiosqlite reads/writes for extractions table
  service.py         # Orchestration only: cache lookup → coalesce → llm → parse → cache write
  routes.py          # APIRouter: POST /api/extract/{classification_id}; status code mapping
```

### 6.3 LLMClient Protocol

```python
# src/api/extraction/llm_client.py
from typing import Protocol

class LLMClient(Protocol):
    def complete_json(self, system_prompt: str, user_prompt: str) -> str: ...

class OllamaLLMClient:
    def __init__(self, settings: Settings) -> None:
        from openai import OpenAI
        self._client = OpenAI(base_url=settings.llm_base_url, api_key=settings.llm_api_key)
        self._model = settings.llm_model
        self._timeout = settings.llm_timeout_seconds

    def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        resp = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            timeout=self._timeout,
        )
        return resp.choices[0].message.content or "{}"

class FakeLLMClient:  # test-only
    def __init__(self, canned: dict[str, str]) -> None:
        self._canned = canned
    def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        return self._canned[user_prompt]
```

Tests inject `FakeLLMClient`. No test ever monkeypatches `openai.OpenAI`.

### 6.4 PR 2 migration (v3)

```sql
CREATE TABLE IF NOT EXISTS extractions (
  pdf_sha256       TEXT NOT NULL,
  prompt_version   INTEGER NOT NULL,
  model            TEXT NOT NULL,
  result_json      TEXT NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (pdf_sha256, prompt_version, model),
  FOREIGN KEY (pdf_sha256) REFERENCES documents(sha256)
);
```

### 6.5 Pydantic models

```python
# src/api/extraction/models.py
from enum import Enum
from pydantic import BaseModel, Field

class FieldName(str, Enum):
    APPLICANT_NAME  = "applicant_name"
    ADDRESS         = "address"
    PERMIT_TYPE     = "permit_type"
    PARCEL_NUMBER   = "parcel_number"
    PROJECT_ADDRESS = "project_address"
    CONTRACTOR_NAME = "contractor_name"
    LICENSE_NUMBER  = "license_number"
    ESTIMATED_COST  = "estimated_cost"
    SQUARE_FOOTAGE  = "square_footage"

class Department(str, Enum):
    BUILDING   = "building"
    ELECTRICAL = "electrical"
    PLUMBING   = "plumbing"
    ZONING     = "zoning"
    OTHER      = "other"

class ExtractedField(BaseModel):
    value:       str | None       # null → MISSING
    source_text: str | None       # verbatim quote from the PDF or null

class ExtractionResult(BaseModel):
    fields:                dict[FieldName, ExtractedField]
    department:            Department
    department_confidence: float = Field(ge=0, le=1)  # advisory; UI hides by default
    model:                 str
    prompt_version:        int
```

### 6.6 Endpoint contract

```
POST /api/extract/{classification_id}
  body: {} (empty) | { force: true } (manual override; runs even if classifier says not-permit)
  → 200 ExtractionResult
  → 404 { error_code: "classification_not_found" }
  → 422 { error_code: "not_a_permit",     message: "Classifier says not a permit. Send { force: true } to override." }
  → 422 { error_code: "pdf_missing",      message: "PDF bytes unavailable for this classification (legacy row)." }
  → 503 { error_code: "llm_unavailable",  message: "LLM extraction temporarily unavailable.", retry_after_s: 30 }
```

Stable `error_code` strings let the UI route to the right state without parsing prose.

### 6.7 In-flight request coalescing

`service.py` keeps a module-level `dict[tuple[str, int, str], asyncio.Future[ExtractionResult]]` keyed by the cache key. When a request arrives:

1. Look up cache. Hit → return.
2. Check coalescing dict. Hit → `await` the existing future.
3. Miss → create future, register, call LLM, parse, cache-write, set future result, remove from dict.

This is the only correct mitigation for the "two impatient clicks → two Ollama calls" pattern. Documented in §10.

### 6.8 Config (env vars)

| Var | Default | Notes |
|---|---|---|
| `LLM_BASE_URL` | `http://host.docker.internal:11434/v1` | Mac/Win Docker Desktop: works. Linux Docker: requires `--add-host=host.docker.internal:host-gateway` or `network_mode: host`. GCP Cloud Run cannot reach a home Ollama; use Tailscale / Cloudflare Tunnel / public proxy. |
| `LLM_API_KEY` | `ollama` | Ignored by Ollama; required by SDK |
| `LLM_MODEL` | `llama3.1:8b` | Override per friend's setup |
| `LLM_TIMEOUT_SECONDS` | `30` | Hard cap |
| `EXTRACTION_PROMPT_VERSION` | `1` | Compiled in `prompts.PROMPT_VERSION`; assert match at startup |
| `DOCQFLOW_PDF_DIR` | `data/pdfs` | Filesystem PDF storage |
| `DOCQFLOW_DB_PATH` | `data/docqflow.db` | Existing |

Document in README that the Docker run command must include `--add-host=host.docker.internal:host-gateway` on Linux.

### 6.9 Tests (PR 1 backend + PR 2)

- **PR 1 backend tests:**
  - `migrations.py`: applies v1 → v2 cleanly on a fresh DB and on a populated v1 DB.
  - `documents` write + read; SHA-256 dedup (same bytes uploaded twice → one file).
  - `GET /api/classifications/{id}/pdf` returns the right bytes; 404 on missing; 410 on legacy NULL.
  - `/api/predict` returns `id` and `pdf_sha256`.
- **PR 2 tests:**
  - `prompts.py`: golden-file output for prompt rendering across 3 sample PDFs.
  - `parser.py`: parses well-formed LLM JSON; rejects malformed; preserves source_text quotes.
  - `cache.py`: read/write/miss; cache invalidation when `prompt_version` bumps.
  - `service.py` with `FakeLLMClient`: cache hit short-circuits; cache miss writes; coalescing dedups two concurrent same-key requests.
  - Endpoint tests via `httpx.AsyncClient`:
    - 200 cache miss → call fake → cache write → result.
    - 200 cache hit → no fake call.
    - 422 `not_a_permit` when classification label is `not-permit-3-8`; overridable with `{ force: true }`.
    - 422 `pdf_missing` for legacy row.
    - 503 `llm_unavailable` when fake raises.
    - 404 `classification_not_found` for unknown id.
    - **Concurrency test:** two concurrent requests for the same sha → exactly one fake LLM call.
- No real network calls in CI.

## 7. Wiring (PR 3) — Detailed

### 7.1 Hook (TanStack Query)

```ts
// frontend/src/hooks/useExtraction.ts
import { useQuery, useMutation } from '@tanstack/react-query'

export function useExtraction(classificationId: string) {
  return useQuery({
    queryKey: ['extraction', classificationId],
    queryFn: () => api.extract(classificationId),
    staleTime: Infinity,                     // cache key already content-addressed server-side
    retry: (count, err) => err.code === 'llm_unavailable' && count < 2,
  })
}

export function useExtractAnyway(classificationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.extract(classificationId, { force: true }),
    onSuccess: data => qc.setQueryData(['extraction', classificationId], data),
  })
}
```

The `usePlaceholderExtraction()` from PR 1 is deleted in PR 3; component code is unchanged because both hooks return the same shape.

### 7.2 UI states for `ExtractedFieldsPanel`

| Backend | UI state | Component shown |
|---|---|---|
| pending fetch | `loading` | `ExtractedFieldRowSkeleton` × 9; "Analyzing..." in `DepartmentCard` |
| 200 | `ok` | Real fields + department; MISSING flagged; source_text on disclosure |
| 422 `not_a_permit` | `not_permit` | `ExtractAnywayBanner` over panel |
| 422 `pdf_missing` | `pdf_missing` | "This is a legacy submission without stored PDF bytes. Re-upload to extract." |
| 503 `llm_unavailable` | `unavailable` | `ErrorBanner` with Retry |
| 404 `classification_not_found` | `not_found` | "Submission not found" + back link to `/submissions` |
| network error | `error` | `ErrorBanner` with Retry |

### 7.3 Tests (PR 3)

- `vi.mock` on `api.extract` for each state.
- Loading → ok transition with mocked timer.
- `ExtractAnywayBanner` click → mutation → state flips to `ok`.
- 404 `not_found` shows back-link.
- Existing PR 1 tests still pass (the `usePlaceholderExtraction` shape contract is locked by TS).
- Contract test: one Playwright test against a real backend with `FakeLLMClient` injected via `dependency_overrides`. Catches PR-2-vs-PR-3 contract drift.

## 8. Review workflow (PR 4) — Detailed

### 8.1 Migration (v4)

```sql
ALTER TABLE classifications ADD COLUMN review_status   TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE classifications ADD COLUMN review_notes    TEXT;
ALTER TABLE classifications ADD COLUMN corrected_fields TEXT;       -- JSON, see schema below
ALTER TABLE classifications ADD COLUMN reviewed_at     TIMESTAMP;
ALTER TABLE classifications ADD COLUMN reviewed_by     TEXT;
-- review_status ∈ {'pending','approved','edited','needs_info'}
```

`corrected_fields` JSON shape: `{"version": 1, "fields": { applicant_name?: string, ... }}`. Versioned so future enum additions don't break old rows.

### 8.2 Endpoint

```
PATCH /api/history/{id}/review
  body:
    {
      "status": "approved" | "edited" | "needs_info",
      "notes": string?,                                   # required if needs_info
      "corrected_fields": { ... }?                        # only meaningful when status == "edited"
    }
  → 200 updated HistoryEntry
  → 404 { error_code: "classification_not_found" }
  → 422 { error_code: "invalid_status" }
  → 422 { error_code: "notes_required_for_needs_info" }
```

`corrected_fields` is silently dropped on `approved` (the API call is still 200; the field just isn't persisted). UI prevents submitting in that case.

### 8.3 Frontend additions

| Component | File |
|---|---|
| `EditDrawer` | `extraction/EditDrawer.tsx` (composed of `FieldEditor`s) |
| `FieldEditor` | `extraction/FieldEditor.tsx` |
| `RequestInfoModal` | `extraction/RequestInfoModal.tsx` |
| `StatusBadge` | `submissions/StatusBadge.tsx` |
| `ReviewBreakdown` | `reports/ReviewBreakdown.tsx` (composed of `StatCard`s) |

`TopBar.tsx` bell becomes meaningful: count of `pending` status from `/api/history?status=pending`.

`reviewed_by` is shown with a "self-reported" affordance (small icon + tooltip) so it doesn't masquerade as authenticated identity.

### 8.4 Tests (PR 4)

- Endpoint: each status transition; rejection on invalid status; notes-required validation; corrected_fields versioned JSON validation.
- Edit drawer: open → edit → save → optimistic update via TanStack Query → rollback on PATCH failure.
- Status filter on Submissions page.
- Bell-count integration test.

## 9. Quality gates (every PR)

Mandatory before opening any PR:

1. **Lint:** `ruff check . && ruff format --check .` (backend); `npm run lint && tsc -b` (frontend).
2. **Test:** `pytest -q` (backend); `npm test -- --run` (frontend).
3. **Build:** `npm run build` to confirm production bundle compiles. Bundle-size assertion: main chunk < 250 kB gzipped.
4. **API surface test:** `GET /api/extract/0` returns 404 (not 200 HTML, the static-mount trap from architect M2).
5. **E2E smoke:** Spin up backend + frontend; Playwright MCP exercises new functionality.
6. **Code review:** `everything-claude-code:code-reviewer` agent on the diff.
7. **Verifier:** `code-verifier` agent confirms requirements met.
8. **Devils-advocate:** challenges the PR plan once before push.
9. **Visual diff:** before/after screenshots in PR description.
10. **Merge-train:** after PR N merges, rebase the next branch and re-run end-to-end smoke before opening PR N+1.

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Friend's Ollama box offline | Extraction broken | Cache-first; 503 with `Retry-After`; UI degrades gracefully; classifier still works. |
| Ollama returns malformed JSON | Extraction broken | `response_format=json_object` + Pydantic validate via `parser.py`; on parse failure log + 503. |
| Two concurrent same-PDF requests double-call Ollama | LLM quota / OOM on single GPU | In-flight coalescing dict in `service.py`; tested. |
| `host.docker.internal` unresolved on Linux | Demo broken in unexpected environment | Documented in §6.8 + README + `.env.example`; safe defaults in `Settings`. |
| `react-pdf` ships in main bundle if any layout component imports it | Bundle bloat | Only `PdfViewer.tsx` and `QueueThumbnail.tsx` may import; both `React.lazy`-wrapped; CI bundle assertion catches regressions. |
| Static-mount swallows `/api/*` 404s | Silent route drift | Quality gate #4: assert `GET /api/extract/0` returns 404. |
| Cross-PR drift | Integration breaks | Merge-train gate (#10); contract test in PR 3 with real backend + FakeLLMClient. |
| Confidence theater | Users trust soft predictions | Default OFF; explicit toggle; per-field signal is `source_text` (verifiable), not `confidence`. |
| LLM hallucinating field values | Bad extractions | Low temperature; explicit "return null if not present"; `source_text` lets reviewer verify against visible PDF; Pydantic enforces shape. |
| Classifier false-negative gates extraction | User can't extract a real permit | "Extract anyway" override (§5.2 `ExtractAnywayBanner`, §6.6 `force: true`). |
| Classifier false-positive triggers LLM | Wasted Ollama call | Acceptable: cached by sha256, second time is free; user can mark it `needs_info`. |
| `pdf_sha256 IS NULL` on legacy rows | Can't extract / can't view PDF | `GET /api/classifications/{id}/pdf` returns 410 Gone; extract returns 422 `pdf_missing`. UI maps to dedicated state. |
| Filesystem PDF dir not mounted in Docker | PDFs lost on container restart | Document `-v $(pwd)/data:/app/data` in README; `Settings.pdf_dir` defaults to `data/pdfs` which is inside the mount. |
| `PROMPT_VERSION` env-vs-code drift | Cache poisoning | Module constant `PROMPT_VERSION` in `prompts.py`; startup assertion that env override (if any) matches. |
| `EXTRACTION_PROMPT_VERSION` cache GC | Cache table grows | Manual `DELETE FROM extractions WHERE prompt_version < ?` script in `scripts/`; non-blocking. |
| `corrected_fields` enum drift | Old rows un-parseable | JSON envelope `{"version": 1, "fields": {...}}`; reader migrates forward or nulls out unknown fields. |
| `reviewed_by` masquerades as auth | False sense of accountability | UI shows "self-reported" affordance + tooltip explaining no auth. |

## 11. Branching and rollout

- All four branches start from latest `origin/main`. Rebase before opening each PR.
- Branch naming: `feat/frontend-overhaul`, `feat/llm-extraction-backend`, `feat/wire-extraction`, `feat/review-workflow`.
- PR 1 is opened independently and may merge before PRs 2–4 are written.
- Each PR adds a single CHANGELOG.md entry per the existing `PR changelog guard` (commit `be781c8`).
- `.poster/` directory is grep-checked for stale route references before merging PR 1.

## 12. Validation checklist

- [x] All 8 brainstorming questions are answered in §3.
- [x] Every component listed in §5.2 is mentioned somewhere as either built (PR 1) or extended (later PRs).
- [x] Every backend endpoint mentioned has either an existing implementation, or a defined contract with status codes and `error_code` values.
- [x] Every DB column / table added has a corresponding migration in §6.1, §6.4, or §8.1, all routed through the `schema_version` runner.
- [x] Every risk in §10 has a mitigation.
- [x] Out-of-scope list (§2) is consistent with what's promised in §4–8.
- [x] All architect + devils-advocate findings either applied or explicitly rejected with rationale (see Appendix A).

## Appendix A — Disposition of agent review findings

| Finding | Source | Disposition |
|---|---|---|
| C1 PR 1 needs `classification_id` | system-architect | Applied: §6.1 PR 1 prerequisites |
| C2 PDF BLOB migration is mandatory | system-architect | Applied: replaced with filesystem + `documents` table |
| C3 SQLite BLOB wrong primitive | system-architect | Applied: replaced with filesystem |
| H1 Cache race / thundering herd | system-architect | Applied: §6.7 in-flight coalescing |
| H2 host.docker.internal Linux | system-architect | Applied: §6.8 + README note |
| H3 useExtraction abstraction too thin | system-architect | Applied: `usePlaceholderExtraction()` shape-matched stub in PR 1 |
| H4 Migration mechanism undefined | system-architect | Applied: `schema_version` runner in §6.1 |
| H5 Confidence-toggle invariant half-true | system-architect | Applied: invariant 4 rewritten in §4.3; per-field signal is `source_text` |
| M1 react-pdf lazy-load pitfalls | system-architect | Applied: only PdfViewer + QueueThumbnail import; bundle assertion in CI |
| M2 static mount swallows API 404s | system-architect | Applied: §9 quality gate #4 |
| M3 corrected_fields no schema validation | system-architect | Applied: versioned JSON envelope in §8.1 |
| M4 PDF re-fetch needs new endpoint | system-architect | Applied: `GET /api/classifications/{id}/pdf` in §6.1 |
| L1 hardcoded label string | system-architect | Applied: gating label centralized in `classify.py` constant |
| L2 prompt_version cache GC | system-architect | Acknowledged: §10 manual script note |
| L3 reviewed_by free-text | system-architect | Applied: "self-reported" affordance in §8.3 |
| X1 No idempotency on /api/extract | system-architect | Applied: §6.7 coalescing covers both |
| X2 No integration test gate | system-architect | Applied: §9 quality gate #10 (merge-train) |
| F1 Module boundaries (service.py god) | architect | Applied: split into `service.py` + `parser.py` + routes own status codes |
| F1 LLMClient Protocol | architect | Applied: §6.3 Protocol + Ollama impl + Fake |
| F2 Component decomposition | architect | Applied: ConfidenceToggle moved to common/, ClassificationBadge / StatCard / FieldEditor / ErrorBanner / ExtractedFieldRowSkeleton added; AutoClassificationCard renamed DepartmentCard |
| F3 useExtraction → TanStack Query | architect | Applied: §7.1 |
| F4 No 404 UI state, ambiguous 422 | architect | Applied: §6.6 stable error_code; §7.2 not_found / pdf_missing states |
| F5 Cache+endpoint integration | architect | Applied: §6.9 concurrency test |
| F5 Contract test PR 2 ↔ PR 3 | architect | Applied: §7.3 Playwright contract test |
| F6 No settings module | architect | Applied: §6.1 `src/api/config.py` |
| F7 documents table separate | architect | Applied: §6.1 |
| F8 Linux Docker / CI env vars | architect | Applied: safe defaults in Settings; FakeLLMClient prevents real network in CI |
| Obj 1 Cut Reports/Queue/LeftRail | devils-advocate | Rejected: user explicitly wants mock layout. Tightened scope (no extra empty-state component, shared StatCard). |
| Obj 2 BLOB storage | devils-advocate | Applied: same as C3 |
| Obj 3 PR 1 ID dependency | devils-advocate | Applied: same as C1 |
| Obj 4 LLM confidence theater | devils-advocate | Applied: per-field `source_text` replaces per-field `confidence`; department `confidence` remains advisory |
| Obj 5 Classifier as gatekeeper | devils-advocate | Applied: classifier advises; `force: true` override + `ExtractAnywayBanner` |
| Obj 6 Queue thumbnail render cost | devils-advocate | Acknowledged: `QueueThumbnail` lazy-imports `react-pdf`; CI bundle assertion enforces |
| Obj 7 Wrong-problem framing | devils-advocate | Partially applied: kept review workflow per Q6, but added explicit non-goal "feedback feeding into retraining" to be revisited later |
| Obj 8 React 19 / Tailwind 4 stability | devils-advocate | Rejected: already in `package.json`, already shipped |
| Obj 9 PR sequence drift | devils-advocate | Applied: merge-train gate §9 #10 |
