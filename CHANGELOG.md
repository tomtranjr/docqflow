# Changelog

Notable changes to DocQFlow are recorded here so reviewers, teammates, and AI agents can quickly see what was added or changed and when.

## 2026-05-09

### Added

- `pipeline_runs` SQLite table (migration v3 in `src/api/migrations.py`) keyed by document `sha256` with a foreign key to `documents`. Stores `document_id` (UUID hex), `llm_profile`, `verdict`, `extracted_fields_json` (JSON-encoded `dict[str, str|bool|None]`), `issues_json` (JSON-encoded `list[Issue]`), `latency_ms`, `created_at`. UPSERT semantics (`INSERT OR REPLACE`) — the same PDF re-uploaded overwrites the prior row, which is acceptable because Stages 4-5 are deterministic and Stage 6 results are intentionally snapshot-replaced. Future per-run history lives in docqflow-2qr.2's Postgres `pipeline_runs` table.
- `src/api/pipeline_runs.py`: `upsert_pipeline_run(sha256, result)` and `get_pipeline_run(sha256) -> dict | None` repository helpers; `get_pipeline_run` returns a dict shaped like `PipelineResult.model_dump()` so callers can pass it straight to `PipelineResult.model_validate(...)`.
- `GET /api/documents/{sha256}` (`src/api/routes_pipeline.py:get_pipeline_run_by_sha`): returns the latest persisted `PipelineResult` for a document; 404 when no pipeline run exists (legacy classify-only uploads, unknown sha). `POST /api/documents/process` now also writes a `pipeline_runs` row after `run_pipeline` succeeds, in addition to the existing `documents` upsert. The POST response now includes `sha256` so the frontend can navigate to the GET endpoint without a separate lookup. `PipelineResult.sha256` is `str | None` (default `None`) to keep existing test constructors valid.
- `tests/pipeline/test_routes_pipeline.py`: 3 new tests — `test_process_persists_pipeline_run_and_returns_sha256` (POST returns the matching `sha256` and the `pipeline_runs` row matches the response), `test_get_document_happy_path` (POST → GET round-trip returns identical `verdict` / `extracted_fields` / `llm_profile`), `test_get_document_404_when_no_pipeline_run` (unknown sha returns 404 with "pipeline run" in the detail). `tests/test_migrations.py` gets `test_apply_migrations_applies_v3_pipeline_runs` plus a fix for the previously hardcoded `len(MIGRATIONS) == 2` assertion (now uses `len(MIGRATIONS)` so adding migrations doesn't break the partial-state advancement test).

### Changed

- `frontend/src/hooks/useUpload.ts`: single-file `addAndProcess` path now calls `processPDF(file, 'cloud-fast')` in parallel with `classifyPDF(file)` via `Promise.all`. The classify result still drives navigation (`/app/review/{result.id}`) and the routing-label / department display, but the parallel `processPDF` call ensures the backend writes a `pipeline_runs` row keyed by sha256 before the user lands on the Review page. `processPDF` failures (e.g. 422 `NotAnAcroForm` for non-permit PDFs, missing `OPENAI_API_KEY`) are caught and logged via `console.warn` so they don't block the classify-driven navigation — Review.tsx falls back to the synthetic placeholder when no `pipeline_run` exists for the document.
- `frontend/src/pages/Review.tsx`: when a numeric URL id resolves to a `liveEntry` with a `pdf_sha256`, fetches `getDocument(sha256)` and renders `extracted_fields` from the real `PipelineResult` instead of the hashed-deterministic synthetic data from `usePlaceholderExtraction`. The new `fieldsFromPipeline` adapter maps 14 well-known AcroForm field names (`'1 STREET ADDRESS OF JOB'`, `'BLOCK & LOT'`, `'2A ESTIMATED COST OF JOB'`, `'CALIF. LIC. NO.'`, `'14 CONTRACTOR'`, `'DATE FILED'`, `ISSUED`, `'7A PRESENT USE'`, `'8A 0CCUP CLASS'`, etc.) to friendly UI labels (`"Street Address"`, `"Block / Lot"`, `"Estimated Cost"`, `"License Number"`, `"Contractor"`, etc.); fields not in the map render under their raw AcroForm key so all real data surfaces. Empty / null / explicitly-`false` values are skipped to match the existing FieldsPanel "missing" semantics. Confidence is fixed at 1.0 for AcroForm-extracted fields (deterministic). Falls back to `fieldsFromExtraction(usePlaceholderExtraction)` only on 404 (legacy entries from before the wiring lands) or while the GET is in flight. Fixes the visible bug where uploading a real permit at `/app/submissions` showed `"Maria Hernandez"`, `"88 Sunset Blvd"`, `"Doe Construction"` regardless of what the actual PDF contained — those values came from `usePlaceholderExtraction`'s hashed synthetic fixture.
- `frontend/src/lib/api.ts`: `getDocument(sha256)` returns `Promise<PipelineResult | null>` — null on 404 (clean branch for "not yet processed"), throws on other errors. `frontend/src/lib/types.ts`: `PipelineResult.sha256` is now `string | null | undefined` to match the backend addition.

### Fixed

- `frontend/src/pages/Review.tsx` + new `frontend/src/lib/pipelineFields.ts`: the previous `fieldsFromPipeline` adapter (added earlier in this section) shipped two bugs that combined to render the FieldsPanel as `0 of 9 fields extracted · 9 missing` for *every* real upload, even though the pipeline persisted the correct AcroForm map. (1) Output keys were friendly labels (`'Street Address'`, `'Block / Lot'`, etc.) but `FieldsPanel.tsx` reads `fields[key]` against snake_case canonical keys (`address`, `parcel_number`, …), so every lookup returned `undefined`. (2) The source AcroForm field names in `PIPELINE_FIELD_LABELS` were invented and did not match what `pypdf.PdfReader.get_fields()` actually returns for Form 3/8 — e.g. `'1 STREET ADDRESS OF JOB'` does not exist (real key is `'1 STREET ADDRESS OF JOB BLOCK  LOT'`, two spaces), `'CALIF. LIC. NO.'` does not exist (real key is `'14C CSLB'`), `'BLOCK & LOT'` does not exist (real key is `'1 BLOCK & LOT'`), and `'15 OWNER - LESSEE'` does not exist (real key is `'15 OWNER  LESSEE'`, two spaces, no dash). Mapping was verified against `data/permit-3-8/permit-3-8_correct_202602125866.pdf` and a second corpus PDF to confirm field-name stability across the corpus. The new `fieldsFromPipeline(extracted, classifierLabel)` lives in its own pure module, emits the seven canonical keys that have a direct Form 3/8 source (`applicant_name`, `address`, `project_address`, `parcel_number`, `contractor_name`, `license_number`, `estimated_cost`), derives `permit_type` from the classifier label (e.g. `'permit-3-8'` → `'Form 3/8 — Building Addition / Alteration'`), and leaves `square_footage` missing (no equivalent on Form 3/8). `address` and `project_address` both resolve to `'1 STREET ADDRESS OF JOB BLOCK  LOT'` because Form 3/8 has only one address field. New `frontend/src/lib/pipelineFields.test.ts` covers the real-corpus mapping, null/empty handling, label derivation (including the "no label" branch), boolean source values, and the empty-input case. The dead `PIPELINE_FIELD_LABELS` constant + the inline adapter were removed from `Review.tsx`. Out of scope (still in docqflow-2qr.2): Supabase Postgres + GCS persistence, and the hard-coded probability-distribution / routing copy in `FieldsPanel.tsx:202-206`.
- `tests/test_classifications.py::test_get_classification_fields_returns_nested_completeness`: replaced a `FORM_3_8_FILLED = data/permit-3-8/permit_202604089128.pdf` corpus reference with a synthetic in-memory fixture (`filled_form_3_8_pdf_bytes` in `tests/conftest.py`). The corpus PDF lived in the gitignored `data/` tree and was not present on a clean clone, so the test failed locally with `FileNotFoundError`. The new `_make_form_3_8_widget_pdf()` helper builds a one-page PDF whose AcroForm widget names mirror `_FIELD_MAP` in `src/api/pdf_fields.py`, so a round-trip through `extract_form_3_8_fields` returns exactly the values the test asserts (`application_number`, `project_address`, `parcel_number`, `estimated_cost`, `contractor_name`, `license_number`) and `evaluate_completeness` returns `passed=True, missing=[]`. CI itself stayed green only because the unrelated `trained_pipeline` fixture skips when `models/model.joblib` is absent — the failure surfaced for any developer running locally with a trained model.

## 2026-05-08

### Added

- Manual Cloud Run dev deploy: image tagged with the current git short-SHA pushed to `us-central1-docker.pkg.dev/docqflow/docqflow/docqflow` (also `:latest`) and rolled out to the `docqflow-api-dev` Cloud Run service in `us-central1` running as `docqflow-api-dev@docqflow.iam.gserviceaccount.com`. Public URL: <https://docqflow-api-dev-825166191827.us-central1.run.app> — `/` serves the React frontend (drop a PDF at `/app/process` to exercise Stages 4-6 end-to-end), `GET /api/llm/profiles` returns `cloud-fast` with `reachable: true` (proves the Secret Manager binding `OPENAI_API_KEY=openai-api-key:latest` resolves through the SA's `roles/secretmanager.secretAccessor`), `POST /api/documents/process` returns full `PipelineResult` against a `permit-3-8` corpus PDF in ~1.5s warm. Built with `--platform linux/amd64` (Apple Silicon → linux/amd64 is required; Cloud Run rejects arm64 images). Image size ~361 MB. Caveats: (1) `--allow-unauthenticated` — anyone with the URL can spend OpenAI credits against `cloud-fast`; `--max-instances 1` caps blast radius but does not gate access. (2) Ephemeral filesystem — `data/docqflow.db` (SQLite) and `data/pdfs/` are wiped on every container restart; persistent storage (Supabase Postgres + GCS) lands in docqflow-2qr.2. (3) First request after a cold start may surface a transient `litellm.InternalServerError: OpenAIException - Connection error`; `run_reasoning` swallows it per design (issue elided, verdict reflects Stages 4-5 only) and warm requests succeed normally. (4) CI deploy automation via Workload Identity Federation is intentionally out of scope — uncommenting `.github/workflows/test.yml` lines ~91-125 plus configuring `WIF_PROVIDER` / `WIF_SERVICE_ACCOUNT` GitHub secrets is a separate follow-up.
- Pipeline eval harness (`scripts/eval_pipeline.py`, `src/eval/metrics.py`, `src/eval/runner.py`): reproducible CLI that grades the Stages 4-6 pipeline against `data/permit-3-8/labels.json` for any LLM profile and emits both a Markdown summary (stdout) and an optional JSON report (`--out`). The JSON report carries per-kind precision / recall / F1 (multiset-count-based: `tp_doc=min(pred,gt)`, `fp_doc=max(pred-gt,0)`, `fn_doc=max(gt-pred,0)`, summed across docs), a 3×3 verdict confusion matrix, p50/p95/p99/max latency in ms, an optional `total_cost_usd` summed from `litellm.acompletion`'s `response._hidden_params['response_cost']`, plus `skipped` and `generated_at`. `--dry-run` patches `src.pipeline.reason.judge` (the imported binding — not `llm_profiles.judge` — because `reason.py` does `from src.pipeline.llm_profiles import judge`) with a stub returning `JudgeResponse(verdict='ok', confidence=1.0)`, so CI smoke runs exercise Stages 4-5 without live LLM calls. `--limit N` is deterministic (filename-sorted slice). Cost reporting is best-effort: when LiteLLM omits `response_cost` on any observed call, `total_cost_usd` becomes `null` rather than failing the run. A live full-corpus run on `cloud-fast` costs roughly $0.07 (revisit once the first live run lands).
- `tests/eval/test_eval_pipeline.py` (18 tests): metric-arithmetic unit tests against crafted Counter / verdict pairs (perfect / mixed / pred-only / gt-only / multi-occurrence cases, percentile edge cases, Markdown-summary content), plus an end-to-end `evaluate_corpus` test against a 6-doc synthetic AcroForm corpus generated with `pymupdf` (one clean doc + five Stage-5-only mutations: `missing_block_lot`, `block_lot_format`, `missing_street_number`, `license_digit_drop`, `date_impossibility_swap`). Synthetic PDFs include a checked `Check Box9` / unchecked `Check Box8` widget pair so `rule_missing_form_checkbox` doesn't false-positive on every doc. Tests are hermetic: no live LLM, no dependency on the gitignored `data/permit-3-8/` corpus, and an autouse fixture resets `gazetteer._instance` between tests.
- `docs/eval.md`: how-to-run + how-to-read-the-report doc covering CLI flags, the JSON report shape, the precision/recall/F1 formulas, what high-FP vs high-FN signals look like for Stage 5 vs Stage 6, the dry-run contract for LLM-only kinds, and the cost-reporting caveat.
- Frontend pipeline integration (`frontend/src/pages/Process.tsx` at `/app/process`, `frontend/src/components/results/PipelineResultPanel.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts`): wires the React frontend to `POST /api/documents/process`. New `processPDF(file, profile)` and `getLLMProfiles()` helpers in `frontend/src/lib/api.ts` mirror the existing `classifyPDF` FormData pattern. New TS types — `PipelineResult`, `Issue`, `Verdict`, `Severity`, `IssueKind` (12 literals matching `src/pipeline/schemas.py`), `IssueSource`, `LLMProfileInfo`, `PipelineExtractedFields` — give compile-time alignment with the Pydantic contract. The `Process` page renders a read-only model indicator (active profile = `cloud-fast`, with reachable / not-reachable pill driven by `GET /api/llm/profiles`), reuses the existing `<DropZone>` for upload, and shows the result via `<PipelineResultPanel>`: verdict pill (clean/minor/major in green/amber/rose), issues grouped by severity (major first) with `field / message / value / source / confidence`, and a collapsible `extracted_fields` summary. Server error detail (e.g. 422 `not an AcroForm`, 413 oversized) surfaces in a `role="alert"` banner via the existing `fetchJSON` error path. Same-origin via FastAPI `StaticFiles` — no CORS work. Auth + history persistence intentionally out of scope (deferred to docqflow-2qr.2). New route added in `frontend/src/App.tsx` at `path: 'process'` under `/app`.
- `frontend/src/pages/Process.test.tsx`: Vitest covering the happy path (mocked `processPDF` + `getLLMProfiles`) — asserts the model indicator renders `openai/gpt-4o-mini` + reachable pill, that dropping a PDF dispatches `processPDF` with the active profile, and that the result panel renders the major-verdict pill plus a major-and-minor issue grouping. A second case asserts that a rejected `processPDF` (mocking the backend's 422 detail string) surfaces in a `role="alert"` banner.
- `POST /api/documents/process` (`src/api/routes_pipeline.py`): synchronous pipeline endpoint that runs Stages 4-6 against an uploaded AcroForm PDF and returns a `PipelineResult`. Pre-flights the LLM profile (registered + reachable) before reading the upload body so unknown / unreachable profiles fail fast at 422 without buffering up to 20 MB. Maps Stage 4 `NotAnAcroForm` and any `pypdf.errors.PyPdfError` (non-PDF bytes, malformed PDF) to 422; oversized uploads to 413; missing gazetteer to 503. Reuses `compute_sha256` / `save_pdf` / `upsert_document` for sha-keyed filesystem persistence + SQLite metadata, mirroring the `/api/predict` flow. Closes docqflow-2qr.1 (demo bead — local FS + SQLite, no auth; GCS + Supabase Postgres deferred to docqflow-2qr.2).
- `Dockerfile`: copies `data/gazetteer/` into the runtime image. Without this, Cloud Run lifespan would crash on `Gazetteer.load()` because `data/gazetteer/sf_parcels.csv` would be missing from the container.
- `tests/pipeline/test_routes_pipeline.py`: 7 functional tests using sync `TestClient` with `reason.judge` mocked at the boundary (no live LLM traffic). Covers happy path against a real corpus PDF, 422 on flat / non-AcroForm PDFs, 422 on non-PDF bytes (regression: surfaced by docker smoke when README.md returned 500 because pypdf's `PdfReadError` was uncaught), 422 on unknown profile, 422 on unreachable profile (env-var pre-flight), 413 on >20 MB uploads, and a no-side-effect-on-rejection regression that asserts 422 paths leave neither a stored PDF nor a `documents` row.

### Changed

- `src/server.py`: configured root logging at `INFO` with `logging.basicConfig(..., force=True)` and added an explicit `logger.info("classifier loaded")` after `load_model()` in lifespan. Without `force=True` the call is a no-op once Uvicorn has installed its `dictConfig` handlers, and Uvicorn's default config only attaches handlers to `uvicorn*` loggers — so application loggers (including the existing `Gazetteer._build` "loaded N gazetteer rows from PATH" message and the per-profile `llm_profile name=… reachable=…` log) silently dropped INFO records on Cloud Run. After this change, `gcloud run services logs read docqflow-api-dev --region=us-central1` surfaces gazetteer + classifier + LLM-profile load lines, satisfying the deploy-readiness verification grep.
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
