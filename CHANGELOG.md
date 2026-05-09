# Changelog

Notable changes to DocQFlow are recorded here so reviewers, teammates, and AI agents can quickly see what was added or changed and when.

## 2026-05-09

### Fixed

- `tests/test_classifications.py::test_get_classification_fields_returns_nested_completeness`: replaced a `FORM_3_8_FILLED = data/permit-3-8/permit_202604089128.pdf` corpus reference with a synthetic in-memory fixture (`filled_form_3_8_pdf_bytes` in `tests/conftest.py`). The corpus PDF lived in the gitignored `data/` tree and was not present on a clean clone, so the test failed locally with `FileNotFoundError`. The new `_make_form_3_8_widget_pdf()` helper builds a one-page PDF whose AcroForm widget names mirror `_FIELD_MAP` in `src/api/pdf_fields.py`, so a round-trip through `extract_form_3_8_fields` returns exactly the values the test asserts (`application_number`, `project_address`, `parcel_number`, `estimated_cost`, `contractor_name`, `license_number`) and `evaluate_completeness` returns `passed=True, missing=[]`. CI itself stayed green only because the unrelated `trained_pipeline` fixture skips when `models/model.joblib` is absent — the failure surfaced for any developer running locally with a trained model.

## 2026-05-08

### Added

- Frontend pipeline integration (`frontend/src/pages/Process.tsx` at `/app/process`, `frontend/src/components/results/PipelineResultPanel.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts`): wires the React frontend to `POST /api/documents/process`. New `processPDF(file, profile)` and `getLLMProfiles()` helpers in `frontend/src/lib/api.ts` mirror the existing `classifyPDF` FormData pattern. New TS types — `PipelineResult`, `Issue`, `Verdict`, `Severity`, `IssueKind` (12 literals matching `src/pipeline/schemas.py`), `IssueSource`, `LLMProfileInfo`, `PipelineExtractedFields` — give compile-time alignment with the Pydantic contract. The `Process` page renders a read-only model indicator (active profile = `cloud-fast`, with reachable / not-reachable pill driven by `GET /api/llm/profiles`), reuses the existing `<DropZone>` for upload, and shows the result via `<PipelineResultPanel>`: verdict pill (clean/minor/major in green/amber/rose), issues grouped by severity (major first) with `field / message / value / source / confidence`, and a collapsible `extracted_fields` summary. Server error detail (e.g. 422 `not an AcroForm`, 413 oversized) surfaces in a `role="alert"` banner via the existing `fetchJSON` error path. Same-origin via FastAPI `StaticFiles` — no CORS work. Auth + history persistence intentionally out of scope (deferred to docqflow-2qr.2). New route added in `frontend/src/App.tsx` at `path: 'process'` under `/app`.
- `frontend/src/pages/Process.test.tsx`: Vitest covering the happy path (mocked `processPDF` + `getLLMProfiles`) — asserts the model indicator renders `openai/gpt-4o-mini` + reachable pill, that dropping a PDF dispatches `processPDF` with the active profile, and that the result panel renders the major-verdict pill plus a major-and-minor issue grouping. A second case asserts that a rejected `processPDF` (mocking the backend's 422 detail string) surfaces in a `role="alert"` banner.
- `POST /api/documents/process` (`src/api/routes_pipeline.py`): synchronous pipeline endpoint that runs Stages 4-6 against an uploaded AcroForm PDF and returns a `PipelineResult`. Pre-flights the LLM profile (registered + reachable) before reading the upload body so unknown / unreachable profiles fail fast at 422 without buffering up to 20 MB. Maps Stage 4 `NotAnAcroForm` and any `pypdf.errors.PyPdfError` (non-PDF bytes, malformed PDF) to 422; oversized uploads to 413; missing gazetteer to 503. Reuses `compute_sha256` / `save_pdf` / `upsert_document` for sha-keyed filesystem persistence + SQLite metadata, mirroring the `/api/predict` flow. Closes docqflow-2qr.1 (demo bead — local FS + SQLite, no auth; GCS + Supabase Postgres deferred to docqflow-2qr.2).
- `Dockerfile`: copies `data/gazetteer/` into the runtime image. Without this, Cloud Run lifespan would crash on `Gazetteer.load()` because `data/gazetteer/sf_parcels.csv` would be missing from the container.
- `tests/pipeline/test_routes_pipeline.py`: 7 functional tests using sync `TestClient` with `reason.judge` mocked at the boundary (no live LLM traffic). Covers happy path against a real corpus PDF, 422 on flat / non-AcroForm PDFs, 422 on non-PDF bytes (regression: surfaced by docker smoke when README.md returned 500 because pypdf's `PdfReadError` was uncaught), 422 on unknown profile, 422 on unreachable profile (env-var pre-flight), 413 on >20 MB uploads, and a no-side-effect-on-rejection regression that asserts 422 paths leave neither a stored PDF nor a `documents` row.

### Changed

- `src/api/routes_pipeline.py`: reordered `process_document` so persistence (`compute_sha256` / `save_pdf` / `upsert_document`) runs only AFTER `run_pipeline` succeeds. Previously persistence ran before the gazetteer readiness check and before Stage 4 validation, so 503 (gazetteer not loaded) and 422 (`NotAnAcroForm` / non-PDF) reject paths still left orphan PDFs on disk and rows in the `documents` table. Mirrors the validate-then-persist order already used in `/api/predict`. Surfaced by CodeRabbit review on PR #39.
- `src/server.py`: mounted `pipeline_router` under `prefix="/api"` to match the existing `api_router`. `GET /llm/profiles` is now `GET /api/llm/profiles`; the new `POST /documents/process` lands at `POST /api/documents/process`. The frontend already targets an `/api` base in `frontend/src/lib/api.ts`, so no client-side change is required for these routes.
- `tests/conftest.py`: the `client` fixture now also seeds `app.state.gazetteer = Gazetteer.load()` so endpoint tests that exercise the pipeline don't trip on the lifespan-managed singleton.
- `tests/pipeline/test_llm_profiles.py`: `test_get_llm_profiles_route` mounts the router with `prefix="/api"` and queries `/api/llm/profiles`, mirroring the production mount path.
- `.github/workflows/test.yml`: split the previous matrixed `lint-and-test` job into three parallel jobs — `changelog` (PR-only, runs the existing CHANGELOG.md gate against the PR diff), `lint` (single Python 3.12 runner: `ruff check` + `ruff format --check`), and `test` (matrix over Python 3.11 and 3.12, runs `pytest -v`). Lint no longer re-runs across the Python matrix (ruff's output is runtime-independent), and `test` now uses `fail-fast: false` so a failure on one Python version doesn't cancel the other. `paths-ignore` continues to skip `docs/**`, `README.md`, and `CONTRIBUTING.md` on both `push` and `pull_request` events. The commented-out `docker-push` block now references `needs: [lint, test]` instead of the old `lint-and-test` job.

## 2026-05-07

### Added

- Stage 6 LLM reasoning (`src/pipeline/reason.py`): two LLM-judged rules — `judge_cost_scope` (kind `cost_scope_mismatch`, judges `'2A ESTIMATED COST OF JOB'` against `'7A PRESENT USE'` and the description fields) and `judge_description` (kind `description_mismatch_bank_form_3_phrasing`, judges the description against the Form 3 / Form 8 selection encoded by `Check Box8` / `Check Box9`). Both call `judge()` from `llm_profiles` with a `JudgeResponse` Pydantic schema (`verdict ∈ {ok, flag}`, `confidence ∈ [0,1]`, `message`). Results below a configurable confidence threshold (default `0.6`) are suppressed. `run_reasoning(fields, profile)` runs both concurrently via `asyncio.gather(return_exceptions=True)` and never raises into the orchestrator: on `LLMTimeout` it emits an `Issue(source='llm', severity='major', confidence=None, message='LLM timeout — manual review required')` so the verdict rollup can route the document to manual review; `LLMSchemaError` and unexpected exceptions are logged and skipped. Re-exported from `src.pipeline`.
- `tests/pipeline/test_reason.py`: 17 tests with `judge()` mocked at the boundary — no live LLM traffic. Covers clean / flagged / low-confidence-suppressed / timeout / schema-error paths for each judge, threshold override, prompt-content assertions (cost prompt includes cost + present-use + description; description prompt reflects which form is selected), and `run_reasoning` aggregation including the never-raises invariant when an unexpected exception is raised inside a judge.

## 2026-05-06

### Added

- Pipeline orchestrator (`src/pipeline/orchestrator.py`): `run_pipeline(pdf_bytes, profile, *, gazetteer) -> PipelineResult` runs Stages 4-6 end-to-end — `read_acroform` → `run_rules` → `await run_reasoning` — concatenates issues, derives the verdict (`any major → 'major'`; else `any minor → 'minor'`; else `'clean'`), and stamps wall-clock `latency_ms`. Stage 4 errors (`NotAnAcroForm`) propagate so the API layer can map them to HTTP 422; Stage 6 failures degrade inside `run_reasoning` (timeout → `Issue`, schema error → skipped) so the orchestrator never raises on LLM failures. Does not touch GCS or the database — those concerns live in the API layer, keeping the function unit-testable and reusable from the eval harness. Re-exported from `src.pipeline`.
- `tests/pipeline/test_orchestrator.py`: integration suite that walks every PDF in `data/permit-3-8/` (100 docs) through `run_pipeline` with `reason.judge` mocked at the boundary. Asserts deterministic verdict accuracy ≥95% on `correct` + `minor` docs (currently 96.25%), that LLM-flagable major docs roll up to `major` and emit the ground-truth `mutations[0].kind`, that `NotAnAcroForm` propagates through the orchestrator, and that an LLM-flagged major issue causes the document to roll up `major`.
- Stage 5 deterministic validation rules (`src/pipeline/validate.py`): `run_rules(fields, gazetteer) -> list[Issue]` plus a public `RULES` registry of pure functions, executed in a fixed order so emitted issues are deterministic. Covers all 10 Stage-5 mutation kinds: `missing_block_lot`, `missing_description` (any of `'16 DESCRIPTION'`..`'16D DESCRIPTION'` non-empty satisfies), `missing_street_number`, `missing_form_checkbox` (Form 3 / Form 8 — neither `'Check Box8'` nor `'Check Box9'` set), `block_lot_format` (regex `^\d{4}/\d{3}$`), `license_digit_drop` (CSLB digit count outside 6–8), `date_impossibility_swap` (`DATE FILED > ISSUED`, parsed as `M/D/YYYY`), and a combined gazetteer rule that emits at most one of `street_suffix_swap` / `address_typo` / `address_block_lot_mismatch` per document so they cannot double-fire on the same address. `missing_*` rules suppress the matching format rule (empty block/lot suppresses `block_lot_format`). Re-exported from `src.pipeline`.
- `tests/pipeline/test_validate.py`: 23 tests with one positive + one negative case per kind, plus baseline-clean, missing→format suppression, and registry-order checks. Exercises `run_rules` against the fixture gazetteer at `tests/fixtures/gazetteer_sample.csv` with synthetic field dicts.
- Stage 4 AcroForm extraction (`src/pipeline/extract.py`): `read_acroform(pdf_bytes) -> ExtractedFields` reads the 87 named fields off a fillable SF permit PDF using `pypdf.PdfReader.get_fields()`. Field names are preserved verbatim (including embedded spaces and known typos like `'8A 0CCUP CLASS'`) since downstream Stage 5 / Stage 6 rules key off them. Text fields return `str | None`, button/checkbox fields are normalized to `True | False | None` (absent `/V` → `None`, distinguishing "explicitly off" from "form left it blank"), signature (`/Sig`) fields are skipped. Flat / OCR-only PDFs raise `NotAnAcroForm` so the upcoming `POST /documents/process` route can return a clean 422. Re-exported from `src.pipeline`.
- `tests/pipeline/test_extract.py`: 7 tests covering full read against `data/permit-3-8/permit-3-8_correct_202604240099.pdf` and the source template, typo-field preservation, missing-optional-field → `None`, button checked vs unchecked, signature skipping, and `NotAnAcroForm` on a runtime-generated flat PDF (template re-saved with `/AcroForm` stripped — no committed binary).
- LLM profile registry + LiteLLM seam (`src/pipeline/llm_profiles.py`): `Profile` dataclass, `REGISTRY` seeded with one entry (`cloud-fast` → `openai/gpt-4o-mini`), env-var-based `available_profiles()` reachability (no live ping), and async `judge(profile, system, user, schema)` that wraps `litellm.acompletion` with a JSON-schema `response_format`, a 15s timeout (`LLMTimeout`), and Pydantic validation (`LLMSchemaError`). Single chokepoint for Stage 6 reasoning calls — additional providers slot in via a registry edit.
- `GET /llm/profiles` (`src/api/routes_pipeline.py`): returns `list[LLMProfileInfo]` so the frontend can discover configured providers and their reachability without a live LLM call. Mounted at root in `src/server.py`; lifespan startup logs reachability for each profile.
- `tests/pipeline/test_llm_profiles.py`: 9 tests covering registry defaults, reachability toggling, schema enforcement, timeout handling, malformed/invalid JSON, and the HTTP route. All `litellm.acompletion` calls are mocked — no live LLM traffic in CI.
- Pinned `litellm` in `pyproject.toml`.

### Fixed

- `block_lot_format` rule (`src/pipeline/validate.py`): regex broadened from `^\d{4}/\d{3}$` to `^\d{4}[A-Z]?/\d{3}[A-Z]?$` so legitimate SF parcel codes carrying alpha suffixes on either component (e.g. `7515A/072`, `0489/033A`, `0071C/001`) are no longer flagged as malformed. Surfaced by the new corpus integration test, which previously saw 7 false-positive `block_lot_format` issues on `correct` docs.

## 2026-05-05

### Added

- SF parcel gazetteer loader (`src/pipeline/gazetteer.py`): `Gazetteer.load()` singleton with `lookup_address(block_lot)` and `closest_address(query, threshold)` (rapidfuzz). Reads from a hand-curated CSV at `data/gazetteer/sf_parcels.csv` (107 rows: 85 from `data/permit-3-8/` permits + 22 near-miss neighbors for fuzzy-match coverage). Loaded once at startup via the FastAPI lifespan and stashed on `app.state.gazetteer`. Unblocks Stage 5 address rules (`address_block_lot_mismatch`, `address_typo`, `street_suffix_swap`). Live ingestion from SF Open Data is a deferred stretch goal — loader API will not change when it lands.
- `tests/pipeline/test_gazetteer.py` + `tests/fixtures/gazetteer_sample.csv`: covers exact lookup, block/lot normalization (`NNNNNNN` → `NNNN/NNN`), fuzzy match within threshold, threshold filtering, and singleton-vs-fresh-instance load semantics.
- `docs/setup/gazetteer.md`: where the CSV lives, how to add rows, refresh cadence.
- Pinned `rapidfuzz` in `pyproject.toml`.
- Pipeline output contract (`src/pipeline/schemas.py`): Pydantic v2 models — `Issue`, `PipelineResult`, `LLMProfileInfo` — and `Literal` aliases for `Severity`, `Verdict`, `Source`, `IssueKind` (12 mutation kinds, exhaustive over `data/permit-3-8/labels.json`). All models use `extra='forbid'` to reject unknown fields. Re-exported from `src.pipeline`. Locks the shape every downstream PIPE-* / API-1 / EVAL-1 ticket imports.
- `tests/pipeline/test_schemas.py`: round-trip, negative-validation, and a hard-fail label-coverage guard that asserts every `mutations[].kind` in the fixture is declared in `IssueKind` — catches schema drift before merge.
- `tests/pipeline/fixtures/labels.json`: synthetic 12-entry fixture covering every `IssueKind`. Replaces the gitignored `data/permit-3-8/labels.json` so the coverage test runs in CI on a clean checkout.
- Pinned `pydantic>=2` explicitly in `pyproject.toml` (was previously transitive via FastAPI).

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
