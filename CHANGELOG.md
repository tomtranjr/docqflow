# Changelog

Notable changes to DocQFlow are recorded here so reviewers, teammates, and AI agents can quickly see what was added or changed and when.

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

- GitHub Actions backend CI: uv installs, ruff lint/format check, pytest on Python 3.11 and 3.12, pinned `ubuntu-24.04` runner.
- Pull request CI: require `CHANGELOG.md` to change when non-documentation code or config files change (README, `docs/`, and other `*.md` except `CHANGELOG.md` are exempt).

### Changed

- Dropped the frontend test job from CI (backend-only pipeline for this repo's current scope).

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
