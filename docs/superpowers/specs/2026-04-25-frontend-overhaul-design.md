# DocQFlow Frontend Overhaul — Design Spec

**Date:** 2026-04-25
**Status:** In review (architect + devils-advocate)
**Owner:** Lokesh Muvva
**Branch:** `feat/frontend-overhaul`
**Stack:** React 19 + Vite 8 + Tailwind 4 + React Router 7 (existing). Adds `react-pdf` (PR 1) + OpenAI Python SDK targeting Ollama (PR 2).

---

## 1. Goal

Overhaul the DocQFlow web app to match the supplied marketing mock: a single-document review workspace with a left marketing rail, top nav (Dashboard / Submissions / Reports / Settings), centered PDF viewer, right-hand extracted-fields panel with auto-classification card, action buttons (Confirm / Edit / Request More Info), and a 6-step process flow strip.

The PDF in the center pane is the user's actual upload. The "Extracted Fields" panel shows real LLM-derived fields (not mock data).

## 2. Non-goals (explicit out-of-scope)

- Authentication / multi-tenant. Reviewer identity is `localStorage`-only.
- Multi-class classifier retraining. Binary classifier (`permit-3-8` vs `not-permit-3-8`) is unchanged. Department label comes from the LLM, not the classifier.
- PDF redaction / annotation tooling.
- Notifications via email or Slack on review status changes.
- Mobile-first redesign (responsive but desktop-first).
- Real-time collaboration / multi-user review of the same submission.

## 3. Decisions captured during brainstorming

| # | Decision | Rationale |
|---|---|---|
| Q1 | Real LLM-driven field extraction (not mock, not rules-only) | Highest product value; appropriate for an MLOps course. |
| Q2 | LLM with content-hash cache (option D) | Bounded cost; resilient to slow / offline LLM box. |
| Q3 | Self-hosted Ollama via OpenAI-compatible API | User's friend hosts the LLM; OpenAI SDK works with custom `base_url`. |
| Q4 | Two-route IA: drop-1 → `/review/:id`, drop-N → `/queue` | Preserves batch workflow without diluting the single-doc design. |
| Q5 | Binary classifier gates extraction; LLM derives department label | Mock-faithful department card without retraining the classifier. |
| Q6 | Real persistence for review actions (Confirm / Edit / Request More Info) | Turns the screen into a real review workflow. |
| Q7 | PDF.js (`react-pdf`), client-side, lazy-loaded on `/review/:id` | Custom toolbar is required; backend stays free of file-serving routes. |
| Q8 | Left marketing rail visible on Dashboard only | Workspace pages need full width for PDF + fields. |
| UX | Confidence percentages hidden by default, toggleable globally + per-page | Avoids treating soft predictions as ground truth. |

## 4. Architecture

### 4.1 PR sequence

| PR | Branch | Scope | Independent value |
|---|---|---|---|
| 1 | `feat/frontend-overhaul` | Frontend layout overhaul. New shells, routes, components, PDF viewer, placeholder fields. Action buttons disabled. | Mock-faithful UI ships; demo-able with current backend. |
| 2 | `feat/llm-extraction-backend` | Ollama-driven `/api/extract`, Pydantic schema, SHA-256 cache, LLM department label. | Real extraction working in isolation, CI-tested with stubbed Ollama. |
| 3 | `feat/wire-extraction` | Replace placeholder fields with real `/api/extract`. Loading / error / "non-permit" / "Ollama unavailable" states. | End-to-end real extraction. |
| 4 | `feat/review-workflow` | DB columns + `PATCH /api/history/{id}/review`. Action buttons fully wired. Submissions status filter. Reports breakdown. | Full review workflow product. |

Each PR starts from latest `origin/main`. Merging is the user's decision; branches are independent.

### 4.2 End-state data flow

```
User drops PDF on /
  POST /api/predict (existing)        TF-IDF + LogReg returns label + probabilities
  → if 1 file:  navigate(/review/:classification_id)
  → if N files: parallel POST per file → navigate(/queue)

/review/:id mount
  if classifier label == permit:
    POST /api/extract/{id}            PR 2; cache-first; falls back to Ollama
       returns:
         {
           fields: { applicant_name: { value, confidence }, address: {...}, ... },
           department: "building" | "electrical" | "plumbing" | "zoning" | "other",
           department_confidence: float,
           model: "llama3.1:8b",
           prompt_version: 1
         }
  else:
    skip extraction; render "not a permit application" empty state in panel

Reviewer action
  PATCH /api/history/{id}/review      PR 4; persists status, notes, corrected fields
```

### 4.3 Invariants

1. `/api/predict` is unchanged — backwards-compatible. Existing API consumers keep working.
2. LLM call is never on the upload critical path. Upload → predict is fast and synchronous; extraction is fired on `/review/:id` mount with a skeleton UI while it runs.
3. Cache key is `sha256(pdf_bytes) || prompt_version || model`. Re-uploading the same file hits cache; bumping `prompt_version` invalidates without an explicit migration.
4. Confidence values exist server-side always; UI hides them by default per Q5 toggle preference.
5. Ollama outage = degraded experience, not broken upload. Classifier still works, PDF still renders, panel shows "Extraction unavailable — try again later" with a Retry button.
6. Review status transitions are server-authoritative. Frontend optimistic updates roll back on PATCH failure.

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
| `TopBar` | `layout/TopBar.tsx` | Wordmark + tab nav + bell + avatar; shared across both shells |
| `LeftRail` | `layout/LeftRail.tsx` | Brand block + 4 marketing tiles (Dashboard only) |
| `CollapsedNav` | `layout/CollapsedNav.tsx` | 64px icon-rail for non-dashboard pages |
| `ProcessFlowStrip` | `layout/ProcessFlowStrip.tsx` | 6-step horizontal flow; `activeStep` prop |
| `DashboardShell` | `layout/DashboardShell.tsx` | TopBar + LeftRail + Outlet + ProcessFlowStrip |
| `WorkspaceShell` | `layout/WorkspaceShell.tsx` | TopBar + CollapsedNav + Outlet |
| `Footer` | `layout/Footer.tsx` | Links to About / GitHub; Dashboard only |

**Dashboard**

| Component | File | Purpose |
|---|---|---|
| `MarketingTile` | `dashboard/MarketingTile.tsx` | Icon + title + body; 4 variants for the rail |
| `EmptyDashboardCenter` | `dashboard/EmptyDashboardCenter.tsx` | Center-pane empty state with drop zone |

**PDF**

| Component | File | Purpose |
|---|---|---|
| `PdfViewer` | `pdf/PdfViewer.tsx` | `react-pdf` wrapper, lazy-loaded |
| `PdfToolbar` | `pdf/PdfToolbar.tsx` | `< 1/N >` page nav, zoom in/out, download |

**Extraction**

| Component | File | Purpose |
|---|---|---|
| `ExtractedFieldsPanel` | `extraction/ExtractedFieldsPanel.tsx` | Header + list of `ExtractedFieldRow` |
| `ExtractedFieldRow` | `extraction/ExtractedFieldRow.tsx` | Icon + label + value + MISSING flag + optional confidence |
| `AutoClassificationCard` | `extraction/AutoClassificationCard.tsx` | Department label + optional confidence + icon |
| `ConfidenceToggle` | `extraction/ConfidenceToggle.tsx` | "Show confidence" pill in workspace header |
| `ActionBar` | `extraction/ActionBar.tsx` | Confirm / Edit / Request More Info buttons (disabled in PR 1, wired in PR 4) |

**Queue / Submissions / Reports**

| Component | File | Purpose |
|---|---|---|
| `QueueGrid` | `queue/QueueGrid.tsx` | Thumbnail grid of session uploads |
| `QueueThumbnail` | `queue/QueueThumbnail.tsx` | First-page render + filename + classification badge |
| `SubmissionsTable` | `submissions/SubmissionsTable.tsx` | Restyled table with classification badge + (PR 4) status badge |
| `ReportsCards` | `reports/ReportsCards.tsx` | Stat cards from `/api/stats` |

**Pages**

| Page | Route | Notes |
|---|---|---|
| `Dashboard` | `/` | Empty drop zone in center; routes upload to `/review/:id` or `/queue` |
| `Review` | `/review/:id` | PDF + extraction panel + action bar |
| `Queue` | `/queue` | Multi-upload grid with thumbnails |
| `Submissions` | `/submissions` | Renamed `History`, restyled |
| `Reports` | `/reports` | Lightweight cards from `/api/stats` |
| `Settings` | `/settings` | Restyled; adds confidence-default toggle |
| `About` | `/about` | Footer link only |

### 5.3 Upload routing

```ts
// frontend/src/hooks/useUpload.ts (extension)
async function addAndProcess(files: File[]) {
  if (files.length === 1) {
    const result = await api.predict(files[0])
    navigate(`/review/${result.classification_id}`)
    return
  }
  const results = await Promise.all(files.map(api.predict))
  // queue context retains thumbnails; navigate to grid
  setQueueResults(results)
  navigate('/queue')
}
```

> The current `/api/predict` returns `{ label, probabilities }` without a primary key. PR 2 needs to return `classification_id` so this navigation works. PR 1 ships with a temporary client-side ID; PR 2 swaps to the server-issued ID.

### 5.4 State / context

- Rename `ThemeContext` → `PreferencesContext`. Holds `{ theme, showConfidence, reviewerName }`. All persist in `localStorage` keyed `docqflow.prefs`.
- `UploadContext` keeps the existing reducer; gains `currentReviewId` and `queueResults`.
- New `ExtractionContext` (PR 3): per-classification cache of `ExtractionResult` so navigating away and back doesn't refetch.

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

[data-theme="dark"] {
  /* dark-variant values; supported but not pixel-perfect to mock */
}
```

### 5.6 Tests (PR 1)

- Vitest + Testing Library suite extends existing tests.
- New unit tests:
  - `DashboardShell` renders LeftRail + ProcessFlowStrip.
  - `WorkspaceShell` does not render LeftRail.
  - `LeftRail` renders 4 `MarketingTile`s.
  - `PdfToolbar` page nav and zoom buttons fire correct callbacks.
  - `ConfidenceToggle` reads / writes `PreferencesContext` and persists.
  - `useUpload`: 1-file route to `/review/:id`, N-file route to `/queue`.
  - `ExtractedFieldRow`: MISSING state when value is null.
- Playwright smoke test (via `e2e-runner` agent): upload one PDF on `/` → land on `/review/:id` → see PDF + placeholder panel.

## 6. Backend LLM extraction (PR 2) — Detailed

### 6.1 New module structure

```
src/api/extraction/
  __init__.py
  models.py          # Pydantic: ExtractedField, ExtractionResult, FieldName, Department
  ollama_client.py   # Thin wrapper around openai.OpenAI(base_url=...)
  prompts.py         # System + user prompt templates; rendering functions
  cache.py           # aiosqlite reads/writes for extractions table
  service.py         # Orchestrate cache → ollama → cache write
  routes.py          # APIRouter: POST /api/extract/{classification_id}
```

### 6.2 DB migrations

```sql
-- extractions cache table
CREATE TABLE IF NOT EXISTS extractions (
  pdf_sha256       TEXT NOT NULL,
  prompt_version   INTEGER NOT NULL,
  model            TEXT NOT NULL,
  result_json      TEXT NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (pdf_sha256, prompt_version, model)
);

-- preserve original PDF bytes so /api/extract can find them later
ALTER TABLE classifications ADD COLUMN pdf_sha256 TEXT;
ALTER TABLE classifications ADD COLUMN pdf_bytes  BLOB;
CREATE INDEX IF NOT EXISTS classifications_sha256_idx ON classifications(pdf_sha256);
```

The cache PK is composite to avoid stale entries when the prompt template or model changes. Bumping `EXTRACTION_PROMPT_VERSION` invalidates without an explicit migration.

The `pdf_bytes` BLOB stores the original upload. Permits are typically 1–3 MB; budget for ~50 MB of cached uploads in the demo footprint, which is well within SQLite limits.

### 6.3 Pydantic models

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
    value:      str | None
    confidence: float = Field(ge=0, le=1)

class ExtractionResult(BaseModel):
    fields:                 dict[FieldName, ExtractedField]
    department:             Department
    department_confidence:  float = Field(ge=0, le=1)
    model:                  str
    prompt_version:         int
```

### 6.4 Endpoint contract

```
POST /api/extract/{classification_id}
  → 200 ExtractionResult              (cached or freshly LLM-derived)
  → 404 if classification not found
  → 422 if classifier label != "permit-3-8"
  → 503 if Ollama unreachable AND no cache (Retry-After header)
```

### 6.5 Ollama integration

```python
# src/api/extraction/ollama_client.py
from openai import OpenAI

def make_client(base_url: str, api_key: str) -> OpenAI:
    return OpenAI(base_url=base_url, api_key=api_key)

def call_ollama(
    client: OpenAI, model: str, system_prompt: str, user_prompt: str, timeout_s: int
) -> str:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        timeout=timeout_s,
    )
    return response.choices[0].message.content or "{}"
```

### 6.6 Config (env vars)

| Var | Default | Purpose |
|---|---|---|
| `LLM_BASE_URL` | `http://host.docker.internal:11434/v1` | Ollama OpenAI-compatible endpoint |
| `LLM_API_KEY` | `ollama` | Ignored by Ollama; required by SDK |
| `LLM_MODEL` | `llama3.1:8b` | Override per friend's setup |
| `LLM_TIMEOUT_SECONDS` | `30` | Hard cap on LLM call |
| `EXTRACTION_PROMPT_VERSION` | `1` | Bump to invalidate cache |

### 6.7 Tests (PR 2)

- `prompts.py`: golden-file output for prompt rendering across 3 sample PDFs.
- `cache.py`: read/write/miss; cache invalidation when `prompt_version` bumps.
- `service.py`: stubbed `OpenAI` client returning canned JSON; cache hit short-circuits.
- Endpoint tests via `httpx.AsyncClient`:
  - 200 cache miss → call stub → cache write → result.
  - 200 cache hit → no LLM call.
  - 422 when classification label is `not-permit-3-8`.
  - 503 when Ollama times out and cache empty.
  - 404 when `classification_id` is unknown.
- No real network calls in CI.

## 7. Wiring (PR 3) — Detailed

### 7.1 Hook

```ts
// frontend/src/hooks/useExtraction.ts
export function useExtraction(classificationId: string) {
  const [state, setState] = useState<ExtractionState>({ kind: 'loading' })
  useEffect(() => {
    let cancelled = false
    api.extract(classificationId)
      .then(r => !cancelled && setState({ kind: 'ok', result: r }))
      .catch(err => !cancelled && setState(mapErrorState(err)))
    return () => { cancelled = true }
  }, [classificationId])
  return state
}
```

### 7.2 UI states for `ExtractedFieldsPanel`

| State | UI |
|---|---|
| `loading` | Skeleton rows (9 of them); classification card shows "Analyzing..." |
| `ok` | Real fields + department; MISSING flagged; confidence on toggle |
| `not_permit` (422) | Empty state: "Not a permit application — extraction skipped" |
| `unavailable` (503) | Warning banner: "Field extraction temporarily unavailable." Retry button. |
| `error` | Same banner + Retry. |

### 7.3 Tests (PR 3)

- MSW (or `vi.mock` on `api.extract`) for each state.
- Loading → ok transition with mocked timer.
- Retry button triggers refetch.
- Existing PR 1 tests still pass.

## 8. Review workflow (PR 4) — Detailed

### 8.1 DB migration

```sql
ALTER TABLE classifications ADD COLUMN review_status   TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE classifications ADD COLUMN review_notes    TEXT;
ALTER TABLE classifications ADD COLUMN corrected_fields TEXT;       -- JSON
ALTER TABLE classifications ADD COLUMN reviewed_at     TIMESTAMP;
ALTER TABLE classifications ADD COLUMN reviewed_by     TEXT;
-- review_status ∈ {'pending','approved','edited','needs_info'}
```

### 8.2 Endpoint

```
PATCH /api/history/{id}/review
  body:
    {
      "status": "approved" | "edited" | "needs_info",
      "notes": string?,
      "corrected_fields": { applicant_name?: string, ... }?
    }
  → 200 updated HistoryEntry
  → 404 if not found
  → 422 on invalid status or non-permit document
```

### 8.3 Frontend additions

| Component | File |
|---|---|
| `EditDrawer` | `extraction/EditDrawer.tsx` |
| `RequestInfoModal` | `extraction/RequestInfoModal.tsx` |
| `StatusBadge` | `submissions/StatusBadge.tsx` |
| `ReviewBreakdown` | `reports/ReviewBreakdown.tsx` |

`TopBar.tsx` bell becomes meaningful: count of `pending` status from `/api/history?status=pending`.

### 8.4 Tests (PR 4)

- Endpoint: each status transition; rejection on invalid status; corrected_fields JSON validation.
- Edit drawer: open → edit → save → optimistic update → rollback on PATCH failure.
- Status filter on Submissions page.
- Bell-count integration test.

## 9. Quality gates (every PR)

Mandatory before opening any PR:

1. **Lint:** `ruff check . && ruff format --check .` (backend); `npm run lint && tsc -b` (frontend).
2. **Test:** `pytest -q` (backend); `npm test -- --run` (frontend).
3. **Build:** `npm run build` to confirm production bundle compiles.
4. **E2E smoke:** Spin up backend + frontend; Playwright MCP exercises the new functionality.
5. **Code review:** `everything-claude-code:code-reviewer` agent on the diff.
6. **Verifier:** `code-verifier` agent confirms requirements met.
7. **Devils-advocate:** challenges the plan once before push.
8. **Visual diff:** before/after screenshots in PR description.

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Friend's Ollama box offline | Extraction broken | Cache-first; 503 on miss; UI degrades gracefully; classifier still works. |
| Ollama returns malformed JSON | Extraction broken | `response_format=json_object` + Pydantic validate; on parse failure, log + 503. |
| Storing PDF BLOBs bloats DB | DB size | Document footprint cap; provide `purge_old_pdfs` script in PR 4 (not endpoint). |
| `react-pdf` bundle size | Frontend perf | Lazy-load on `/review/:id` only via `React.lazy`. |
| Cross-PR drift | Integration breaks | Each PR rebases off latest main; PR 3 explicitly retests PR 1+2 contracts. |
| Confidence theater | Users trust soft predictions | Default OFF; toggle is explicit; MISSING flag is the load-bearing signal. |
| LLM hallucinating field values | Bad extractions | Low temperature (0.1); explicit "return null if not present" in prompt; Pydantic enforces shape; reviewer can correct via Edit drawer (PR 4). |
| `pdf_bytes` BLOB on existing rows | NULL on legacy classifications | `/api/extract` returns 422 with hint "re-upload required" if `pdf_bytes IS NULL`. |
| Multiple uploads of the same file race the cache | Duplicate Ollama calls | Cache write uses `INSERT OR IGNORE`; second writer is a no-op. |

## 11. Branching and rollout

- All four branches start from latest `origin/main`. Rebase before opening each PR.
- Branch naming: `feat/frontend-overhaul`, `feat/llm-extraction-backend`, `feat/wire-extraction`, `feat/review-workflow`.
- PR 1 is opened independently and may merge before PRs 2–4 are written.
- Documented review-flow in CHANGELOG.md per existing convention.

## 12. Validation checklist

Before declaring this spec done, confirm:

- [ ] All 8 brainstorming questions are answered in §3.
- [ ] Every component listed in §5.2 is mentioned somewhere as either built (PR 1) or extended (later PRs).
- [ ] Every backend endpoint mentioned has either an existing implementation, or a defined contract with status codes.
- [ ] Every DB column added has a corresponding migration in §6.2 or §8.1.
- [ ] Every risk in §10 has a mitigation.
- [ ] Out-of-scope list (§2) is consistent with what's promised in §4–8.
- [ ] No "TBD" or "TODO" remains in the doc.
