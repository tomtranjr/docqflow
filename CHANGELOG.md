# Changelog

Notable changes to DocQFlow are recorded here so reviewers, teammates, and AI agents can quickly see what was added or changed and when.

## 2026-05-04

### Added

- LLM credential plumbing for the extraction pipeline. `OPENAI_API_KEY` lives in Google Secret Manager (`openai-api-key`, project `docqflow`); the `docqflow-api-dev` service account has `roles/secretmanager.secretAccessor` so Cloud Run can read it. Local dev hydrates `.env` via `gcloud secrets versions access`.
- `docs/llm-profiles.md`: documents the `cloud-fast` profile (OpenAI `gpt-4o-mini`, expected latency, expected cost) and the workflow for hydrating a local key from Secret Manager.
- `scripts/check_llm_profiles.py`: env-only smoke check that verifies `OPENAI_API_KEY` is set and looks valid. No network call — keeps CI free and avoids burning OpenAI budget.
- `.env.example`: `LLM_DEFAULT_PROFILE`, `OPENAI_MODEL`, `OPENAI_API_KEY` placeholders.

## 2026-05-02

### Added

- GCS dev bucket setup: `docqflow-pdfs-dev` in `us-west1` with uniform bucket-level access, public access prevention, and a 30-day delete lifecycle. Service account `docqflow-api-dev` granted `roles/storage.objectAdmin` scoped to the bucket only. Workload Identity Federation pool `github-pool-dev` configured for `tomtranjr/docqflow` GitHub Actions — no static JSON keys.
- `docs/setup/gcp.md`: project + APIs, bucket creation, lifecycle, optional CORS, service account IAM, WIF for GitHub Actions, local `gcloud auth application-default login`, and a smoke test.
- `.env.example`: `GCP_PROJECT` and `GCS_BUCKET` placeholders.
- Supabase dev project setup: `documents` and `pipeline_runs` tables under `supabase/migrations/`, with row-level security limiting access to `auth.uid() = uploaded_by` (and the matching join policy on `pipeline_runs`).
- `docs/setup/supabase.md`: how to install the CLI, get credentials, run migrations locally (`supabase db reset`), push to dev (`supabase db push`), and add new migrations.
- `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` placeholders.

## 2026-05-01

### Changed

- Extracted `_parse_probs` helper in `src/api/routes.py` to deduplicate the JSON-deserialisation logic that was copy-pasted across three route handlers (`list_history`, `get_history_entry`, `get_classification_metadata`). No behaviour change.
- Standardized API port on `8080` across all docs (README, `docs/docker-registry.md`) to match the `Dockerfile`'s `EXPOSE 8080` so local dev and Docker share a single port.
- Fixed documentation drift left over from the April 26 `src/` refactor: README and `docs/model-training.md` now reference `src.classifier` / `src/classifier.py` (not the removed `classify.py`), and API examples use the prefixed routes `/api/health`, `/api/predict`, `/api/history`, `/api/stats`. README structure tree updated to list `.env.example` and `scripts/generate_permits.py`.

### Removed

- `docs/specs/2026-04-15-frontend-design.md`: stale design spec accidentally committed from a Claude Code session. Current architecture is documented in the README and the other `docs/` files.

## 2026-04-27

### Changed

- CI: add `paths-ignore` to both `push` and `pull_request` triggers in `.github/workflows/test.yml` so the workflow does not run when the only changed paths are under `docs/`, `README.md`, or `CONTRIBUTING.md`. Saves runner minutes on doc-only changes.

## 2026-04-26

### Added

- `scripts/generate_permits.py`: one-shot training-data generator that builds Form 3-8 PDFs from SF Data Portal records. Produces three flavors in a single batch — `correct` (ground truth), `minor` (1–3 field-level mutations), `major` (one cross-field contradiction across semantic, numerical, temporal, or spatial axes).
- `data/permit-3-8/labels.json`: per-PDF supervised-learning answer key written on every run, recording each mutation's field, before/after values, and `kind` tag.
- Deterministic mutation seeding (`sha256(permit_number)`) so re-runs produce byte-identical PDFs, and a manifest (`.manifest.json`) so re-runs append new permits instead of duplicating. `--reset` wipes for a clean regeneration.
- Design doc at `docs/permit-generation.md` covering flavors, mutation types, CLI flags, and how to use `labels.json` for pipeline evaluation.

### Changed

- Reorganized project layout: moved `server.py` and `classify.py` into `src/` (renamed to `src/classifier.py`), folded the misnamed `app.py` router into `src/api/routes.py`, and moved the MLflow connection probe `main.py` to `scripts/check_mlflow.py`. The repo root no longer contains loose Python modules.
- The model pipeline is now stored on `app.state.pipeline` (set in lifespan, read via `Request`) instead of a module-level global in `server.py`. This removes the circular import between `server.py` and the old `app.py` and the `# noqa: E402` / function-local import workarounds that came with it.
- Updated `Dockerfile` to copy `src/` only and run `uvicorn src.server:app`.
- Updated `README.md` with the new run commands (`python -m src.classifier train`, `uvicorn src.server:app`, `python scripts/check_mlflow.py`) and a refreshed project structure tree.

## 2026-04-25

### Added

- Frontend overhaul (PR 1 of 4): mock-faithful Dashboard / Review / Queue / Submissions / Reports / Settings pages with `DashboardShell` (LeftRail + ProcessFlowStrip) and `WorkspaceShell`.
- `react-pdf` (lazy-loaded) viewer with custom toolbar (page nav, zoom, download) on `/review/:id` and PDF first-page thumbnails on `/queue`.
- `PreferencesContext` (replaces `ThemeContext`) with theme + show-confidence + reviewer-name preferences persisted to `localStorage`.
- Backend: `documents` table + filesystem PDF storage at `data/pdfs/{sha256}.pdf` (deduplicated by SHA-256).
- Backend: `id` and `pdf_sha256` returned from `/api/predict`, plus new `GET /api/classifications/{id}` and `GET /api/classifications/{id}/pdf` endpoints.
- Backend: `src/api/config.py` Settings module and `src/api/migrations.py` schema_version-based migration runner.
- Backend: 20 MB upload size cap; filename sanitization in `Content-Disposition`; SHA-256 path validation.
- Frontend bundle-size guard (`scripts/check-bundle-size.mjs`) with 250 KB gzipped budget for the main chunk.
- `usePlaceholderExtraction` hook produces shape-matched stub data that varies per `classificationId`; PR 3 will swap it for the real `useExtraction` against `/api/extract`.
- GitHub Actions backend CI: uv installs, ruff lint/format check, pytest on Python 3.11 and 3.12, pinned `ubuntu-24.04` runner.
- Pull request CI: require `CHANGELOG.md` to change when non-documentation code or config files change (README, `docs/`, and other `*.md` except `CHANGELOG.md` are exempt).

### Changed

- `/api/predict` response now includes `id` and `pdf_sha256` (additive; existing fields unchanged).
- `History` page renamed to `Submissions`; `/` now hosts the new Dashboard.
- Dropped the frontend test job from CI (backend-only pipeline for this repo's current scope).

### Removed

- `Classify` page (functionality merged into Dashboard); `Header.tsx` (replaced by `TopBar`); `Shell.tsx` (replaced by the two new shells); `ThemeContext` (replaced by `PreferencesContext`).

## 2026-04-23

### Changed

- Pre-commit hooks: ruff can auto-fix on commit (see project pre-commit config).

## 2026-04-19

### Added

- Expanded backend tests for stats and history edge cases.

## 2026-04-17

### Added

- React frontend SPA with classification history UI.

## 2026-04-12

### Added

- Pre-commit hooks with ruff linter and format checker.

## 2026-04-11

### Changed

- CodeRabbit-driven cleanup and dependency tweaks from chat review.

## 2026-04-04

### Added

- README links to detailed guides under `docs/`.

### Changed

- More graceful model loading, slimmer Docker dependencies, README updates.

## 2026-04-03

### Added

- Dockerfile for containerizing the FastAPI app.
- FastAPI service for the document classifier.
- MLflow-related setup and dotenv-based configuration support.
