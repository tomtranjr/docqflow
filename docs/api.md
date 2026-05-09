# API Reference

DocQFlow exposes two surfaces:

1. **Classifier endpoints** (`/api/predict`, `/api/history`, `/api/stats`,
   `/api/documents/{sha256}/fields`) — Stages 1–3 (TF-IDF + Logistic
   Regression). Currently public; SQLite-backed. Not described here — see
   [`src/api/routes.py`](../src/api/routes.py).
2. **Pipeline endpoints** (`/api/documents/process`, `/api/documents/{sha256}`,
   `/api/llm/profiles`) — Stages 4–6 (extract / validate / reason).
   Productionized in `docqflow-2qr.2`: GCS for blobs, Supabase Postgres for
   metadata, Supabase JWT auth. Documented below.

## Authentication

Pipeline endpoints require a Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase_access_token>
```

The token is verified with HS256 against `SUPABASE_JWT_SECRET`. The
`sub` claim (a UUID) is read as `auth.uid()` and stored on
`documents.uploaded_by`.

Missing / malformed / expired tokens return **401**:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
Content-Type: application/json

{"detail": "Missing or invalid Authorization header"}
```

## CORS

The API allow-lists origins via `CORS_ALLOWED_ORIGINS` (comma-separated).
Defaults: `https://docqflow.vercel.app`, `http://localhost:3000`,
`http://localhost:5173`. Methods: `GET`, `POST`, `OPTIONS`. Allowed
headers: `Authorization`, `Content-Type`. Credentials: enabled.

## `POST /api/documents/process`

Run Stages 4–6 against an uploaded AcroForm PDF and return a verdict.
Synchronous — the response includes the full pipeline result.

**Request** (multipart/form-data):

| Field     | Type   | Required | Description                                  |
|-----------|--------|----------|----------------------------------------------|
| `file`    | binary | yes      | PDF, max 20 MB. Must be a fillable AcroForm. |
| `profile` | string | yes      | LLM profile name. v1: `cloud-fast` only.     |

**Response 200** (`application/json`):

```json
{
  "document_id": "00000000-0000-4000-8000-000000000001",
  "sha256": "a1b2c3d4e5f6...64hex",
  "llm_profile": "cloud-fast",
  "verdict": "minor",
  "extracted_fields": {
    "1 BLOCK & LOT": "3573/056",
    "1 STREET ADDRESS OF JOB BLOCK  LOT": "2130 Harrison St #9"
  },
  "issues": [
    {
      "kind": "block_lot_format",
      "severity": "minor",
      "field": "1 BLOCK & LOT",
      "value": "3573056",
      "message": "Expected NNNN/NNN format",
      "source": "rule",
      "confidence": null
    }
  ],
  "latency_ms": 1234
}
```

**Side effects:**

1. Upload `pdf_bytes` to `gs://{GCS_BUCKET}/originals/{sha256}.pdf` if not
   already present (skip-if-exists).
2. INSERT or SELECT `documents` row keyed by `(uploaded_by, sha256)` —
   re-uploading the same PDF as the same user returns the existing
   `document_id` (per-user dedupe).
3. INSERT one new `pipeline_runs` row with `extracted_fields`, `issues`,
   `verdict`, `llm_profile`, `latency_ms`; `ground_truth` is left NULL.
4. Persistence happens **only after** the pipeline succeeds. 422 / 503
   reject paths leave no orphan blobs or rows.

**Error responses:**

| Status | When                                                     |
|--------|----------------------------------------------------------|
| 401    | Missing / invalid / expired bearer token                 |
| 413    | Body exceeds 20 MB                                       |
| 422    | Empty file, non-PDF bytes, flat (non-AcroForm) PDF       |
| 422    | `profile` not in registry, or registered but unreachable |
| 503    | Gazetteer not loaded (service still starting up)         |

## `GET /api/documents/{sha256}`

Return the latest persisted `PipelineResult` for the calling user's
document. Frontend uses this after upload to render results without
re-uploading.

**Response 200**: same shape as `POST /api/documents/process`.

**Response 404**: no pipeline run exists for `(auth.uid(), sha256)`. The
sha256 is also returned 404 if it belongs to another user — defense in
depth on top of RLS.

## `GET /api/llm/profiles`

Return all registered LLM profiles with current reachability. No auth.

**Response 200**:

```json
[
  {
    "name": "cloud-fast",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "reachable": true
  }
]
```

`reachable` is computed on each request from the relevant API-key env var
(e.g. `OPENAI_API_KEY` for OpenAI). Use this to gate the UI submit button
when the active profile is unreachable.

## Environment variables

Required for the prod-swap pipeline endpoints:

- `DATABASE_URL` — Postgres connection string (Supabase pooler or direct).
- `SUPABASE_JWT_SECRET` — HS256 signing secret (Supabase Project Settings → API → JWT Settings).
- `GCS_BUCKET` — bucket name (e.g. `docqflow-pdfs-dev`).
- `GCP_PROJECT` — GCP project (e.g. `docqflow`).
- `OPENAI_API_KEY` — required for `cloud-fast` reachability.
- `CORS_ALLOWED_ORIGINS` — optional, comma-separated; defaults shown above.

Service-account auth is via Application Default Credentials (`gcloud auth
application-default login` for local dev; Workload Identity Federation
for Cloud Run / GitHub Actions — see [`docs/setup/gcp.md`](setup/gcp.md)).
