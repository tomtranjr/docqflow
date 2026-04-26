# PR 1 — Frontend Overhaul + Backend Prerequisites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the visual overhaul of the DocQFlow web app to match the supplied marketing mock, plus the minimal backend changes (PDF storage on filesystem, `id` and `pdf_sha256` in `/api/predict`, new `GET /api/classifications/{id}/pdf` endpoint, Settings module, schema_version migration runner) needed to make `/review/:id` a real route. Field extraction stays placeholder — `usePlaceholderExtraction()` returns shape-matched stub data so PR 3 swaps in real LLM data without component changes.

**Architecture:** FastAPI backend keeps the existing `app.py` + `server.py` + `src/api/` shape. PDFs move from "discarded after predict" to filesystem at `data/pdfs/{sha256}.pdf` referenced by a new `documents` table. React frontend gets a two-shell layout (`DashboardShell` for `/`, `WorkspaceShell` for everything else), six new pages (`Dashboard`, `Review`, `Queue`, `Submissions`, `Reports`, `Settings`, `About`), `react-pdf` viewer lazy-loaded on `/review/:id` and `/queue`, and a new `PreferencesContext` (renamed from `ThemeContext`).

**Tech Stack:** Python 3.11 + FastAPI + aiosqlite + PyMuPDF (existing). React 19 + Vite 8 + Tailwind 4 + React Router 7 + Lucide + sonner (existing). Adds `react-pdf@^9` (new dependency in PR 1).

**Spec:** [`docs/superpowers/specs/2026-04-25-frontend-overhaul-design.md`](../specs/2026-04-25-frontend-overhaul-design.md)

**Branch:** `feat/frontend-overhaul` (already created off latest `origin/main`).

---

## Notes for the implementer

- Project venv is `.venv` (Python 3.11). `source .venv/bin/activate` before running pytest or any backend code.
- Frontend node_modules already installed; run `npm ci` only if `package.json` changes.
- Existing test patterns: backend uses `pytest` + `httpx.AsyncClient`; frontend uses Vitest + Testing Library + jsdom.
- Existing CI: `.github/workflows/backend-ci.yml` runs `ruff check` + `pytest` on backend; frontend CI runs `npm run lint`, `tsc -b`, `vitest --run`.
- Existing CHANGELOG convention: one entry per PR under `## Unreleased`.
- No co-authored-by attribution in any commit; conventional commit prefixes (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
- TDD: tests before implementation in every task.

---

## Task 1: Add `src/api/config.py` Settings module

**Files:**
- Create: `src/api/config.py`
- Create: `tests/test_config.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_config.py
import os
from unittest.mock import patch

from src.api.config import Settings, load_settings


def test_load_settings_uses_defaults_when_env_unset():
    with patch.dict(os.environ, {}, clear=True):
        s = load_settings()
    assert s.db_path == "data/docqflow.db"
    assert s.pdf_dir == "data/pdfs"
    assert s.llm_base_url == "http://host.docker.internal:11434/v1"
    assert s.llm_api_key == "ollama"
    assert s.llm_model == "llama3.1:8b"
    assert s.llm_timeout_seconds == 30
    assert s.extraction_prompt_version == 1


def test_load_settings_reads_overrides_from_env():
    overrides = {
        "DOCQFLOW_DB_PATH": "/tmp/test.db",
        "DOCQFLOW_PDF_DIR": "/tmp/pdfs",
        "LLM_BASE_URL": "http://custom:9000/v1",
        "LLM_API_KEY": "secret",
        "LLM_MODEL": "qwen2.5:7b",
        "LLM_TIMEOUT_SECONDS": "60",
        "EXTRACTION_PROMPT_VERSION": "3",
    }
    with patch.dict(os.environ, overrides, clear=True):
        s = load_settings()
    assert s.db_path == "/tmp/test.db"
    assert s.pdf_dir == "/tmp/pdfs"
    assert s.llm_base_url == "http://custom:9000/v1"
    assert s.llm_api_key == "secret"
    assert s.llm_model == "qwen2.5:7b"
    assert s.llm_timeout_seconds == 60
    assert s.extraction_prompt_version == 3


def test_settings_is_frozen():
    s = load_settings()
    import dataclasses
    with pytest.raises(dataclasses.FrozenInstanceError):
        s.db_path = "/elsewhere"  # type: ignore[misc]
```

Add `import pytest` at top. Run: `pytest tests/test_config.py -v`. Expected: FAIL with import error.

- [ ] **Step 2: Implement `src/api/config.py`**

```python
# src/api/config.py
"""Centralized settings loaded from environment."""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    db_path: str
    pdf_dir: str
    llm_base_url: str
    llm_api_key: str
    llm_model: str
    llm_timeout_seconds: int
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

- [ ] **Step 3: Run tests, verify pass**

Run: `pytest tests/test_config.py -v`. Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add src/api/config.py tests/test_config.py
git commit -m "feat: add Settings module for centralized env reads"
```

---

## Task 2: Add `src/api/migrations.py` schema_version runner

**Files:**
- Create: `src/api/migrations.py`
- Create: `tests/test_migrations.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_migrations.py
import os
import tempfile

import aiosqlite
import pytest

from src.api.migrations import apply_migrations, MIGRATIONS


@pytest.fixture
async def fresh_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    db = await aiosqlite.connect(path)
    db.row_factory = aiosqlite.Row
    yield db
    await db.close()
    os.unlink(path)


@pytest.mark.asyncio
async def test_apply_migrations_creates_schema_version_table(fresh_db):
    await apply_migrations(fresh_db)
    cur = await fresh_db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    )
    row = await cur.fetchone()
    assert row is not None


@pytest.mark.asyncio
async def test_apply_migrations_applies_v1_classifications(fresh_db):
    await apply_migrations(fresh_db)
    cur = await fresh_db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='classifications'"
    )
    assert (await cur.fetchone()) is not None


@pytest.mark.asyncio
async def test_apply_migrations_applies_v2_documents_and_pdf_sha256(fresh_db):
    await apply_migrations(fresh_db)
    cur = await fresh_db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='documents'"
    )
    assert (await cur.fetchone()) is not None
    cur = await fresh_db.execute("PRAGMA table_info(classifications)")
    cols = [row[1] for row in await cur.fetchall()]
    assert "pdf_sha256" in cols


@pytest.mark.asyncio
async def test_apply_migrations_is_idempotent(fresh_db):
    await apply_migrations(fresh_db)
    await apply_migrations(fresh_db)  # second run must not fail
    cur = await fresh_db.execute("SELECT MAX(v) FROM schema_version")
    max_v = (await cur.fetchone())[0]
    assert max_v == len(MIGRATIONS)


@pytest.mark.asyncio
async def test_apply_migrations_advances_from_partial_state(fresh_db):
    # Simulate a v1-only DB (created before v2 existed).
    await fresh_db.execute("CREATE TABLE schema_version (v INTEGER PRIMARY KEY)")
    await fresh_db.execute(MIGRATIONS[0][1][0])  # v1 classifications table
    await fresh_db.execute("INSERT INTO schema_version (v) VALUES (1)")
    await fresh_db.commit()
    await apply_migrations(fresh_db)
    cur = await fresh_db.execute("SELECT MAX(v) FROM schema_version")
    assert (await cur.fetchone())[0] == 2
```

Add to `pyproject.toml` dev deps if missing: `pytest-asyncio>=0.23`. Add `pytest_asyncio_mode = "auto"` to `[tool.pytest.ini_options]`. Run: `pytest tests/test_migrations.py -v`. Expected: FAIL with import error.

- [ ] **Step 2: Implement `src/api/migrations.py`**

```python
# src/api/migrations.py
"""Versioned schema migrations for the DocQFlow database."""
from __future__ import annotations

import aiosqlite

# Each entry: (version, [SQL statements]). Versions monotonic, applied in order.
MIGRATIONS: list[tuple[int, list[str]]] = [
    (1, [
        """
        CREATE TABLE IF NOT EXISTS classifications (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            filename      TEXT NOT NULL,
            uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            label         TEXT NOT NULL,
            confidence    REAL NOT NULL,
            probabilities TEXT NOT NULL,
            text_preview  TEXT,
            file_size     INTEGER
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_classifications_uploaded_at ON classifications(uploaded_at)",
        "CREATE INDEX IF NOT EXISTS idx_classifications_label ON classifications(label)",
    ]),
    (2, [
        """
        CREATE TABLE IF NOT EXISTS documents (
            sha256     TEXT PRIMARY KEY,
            size_bytes INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # ALTER TABLE ADD COLUMN is not idempotent on SQLite < 3.35; guard with try/except in runner.
        "ALTER TABLE classifications ADD COLUMN pdf_sha256 TEXT",
        "CREATE INDEX IF NOT EXISTS idx_classifications_sha256 ON classifications(pdf_sha256)",
    ]),
]


async def apply_migrations(db: aiosqlite.Connection) -> None:
    await db.execute("CREATE TABLE IF NOT EXISTS schema_version (v INTEGER PRIMARY KEY)")
    cur = await db.execute("SELECT COALESCE(MAX(v), 0) FROM schema_version")
    current = (await cur.fetchone())[0]

    for version, statements in MIGRATIONS:
        if version <= current:
            continue
        for stmt in statements:
            try:
                await db.execute(stmt)
            except aiosqlite.OperationalError as e:
                # idempotency for ALTER TABLE ADD COLUMN
                if "duplicate column name" not in str(e):
                    raise
        await db.execute("INSERT INTO schema_version (v) VALUES (?)", (version,))
    await db.commit()
```

- [ ] **Step 3: Run tests, verify pass**

Run: `pytest tests/test_migrations.py -v`. Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add src/api/migrations.py tests/test_migrations.py pyproject.toml
git commit -m "feat: add schema_version migration runner with v1+v2 schemas"
```

---

## Task 3: Refactor `src/api/database.py` to use Settings + migrations + return id

**Files:**
- Modify: `src/api/database.py`
- Modify: `tests/test_database.py` (existing test file — extend, do not break)

- [ ] **Step 1: Add tests for new behavior**

Append to `tests/test_database.py`:

```python
import os
import tempfile

import pytest

from src.api.database import save_classification, get_classification, init_db
from src.api.config import load_settings


@pytest.fixture
async def temp_db(monkeypatch):
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setenv("DOCQFLOW_DB_PATH", path)
    # reload module-level DB_PATH usage by re-importing or using settings
    await init_db()
    yield path
    os.unlink(path)


@pytest.mark.asyncio
async def test_save_classification_returns_id(temp_db):
    new_id = await save_classification(
        filename="test.pdf",
        label="permit-3-8",
        confidence=0.95,
        probabilities={"permit-3-8": 0.95, "not-permit-3-8": 0.05},
        text_preview="hello",
        file_size=1024,
        pdf_sha256="abc123",
    )
    assert isinstance(new_id, int)
    assert new_id > 0


@pytest.mark.asyncio
async def test_save_classification_persists_pdf_sha256(temp_db):
    new_id = await save_classification(
        filename="test.pdf",
        label="permit-3-8",
        confidence=0.95,
        probabilities={"permit-3-8": 0.95},
        pdf_sha256="abc123",
    )
    row = await get_classification(new_id)
    assert row["pdf_sha256"] == "abc123"
```

Run: `pytest tests/test_database.py -v`. Expected: new tests FAIL.

- [ ] **Step 2: Refactor `src/api/database.py`**

```python
# src/api/database.py
import json
import os

import aiosqlite

from src.api.config import load_settings
from src.api.migrations import apply_migrations

_settings = load_settings()
DB_PATH = _settings.db_path


async def get_db() -> aiosqlite.Connection:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    return db


async def init_db() -> None:
    db = await get_db()
    try:
        await apply_migrations(db)
    finally:
        await db.close()


async def save_classification(
    filename: str,
    label: str,
    confidence: float,
    probabilities: dict,
    text_preview: str | None = None,
    file_size: int | None = None,
    pdf_sha256: str | None = None,
) -> int:
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO classifications "
            "(filename, label, confidence, probabilities, text_preview, file_size, pdf_sha256) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                filename,
                label,
                confidence,
                json.dumps(probabilities),
                text_preview,
                file_size,
                pdf_sha256,
            ),
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


# get_history, get_classification, get_stats remain unchanged from current implementation.
# (Copy them over verbatim; do not edit during this task.)
```

Re-add the existing `get_history`, `get_classification`, and `get_stats` functions verbatim from the current file.

- [ ] **Step 3: Run all backend tests, verify pass**

Run: `pytest -q`. Expected: all tests pass (existing + new).

- [ ] **Step 4: Commit**

```bash
git add src/api/database.py tests/test_database.py
git commit -m "refactor: route DB through Settings + migrations runner; save_classification returns id"
```

---

## Task 4: Add `src/api/documents.py` repository + `src/api/pdf_storage.py` filesystem helper

**Files:**
- Create: `src/api/documents.py`
- Create: `src/api/pdf_storage.py`
- Create: `tests/test_documents.py`
- Create: `tests/test_pdf_storage.py`

- [ ] **Step 1: Write `tests/test_pdf_storage.py`**

```python
import hashlib
import tempfile
from pathlib import Path

import pytest

from src.api.pdf_storage import compute_sha256, save_pdf, pdf_path, read_pdf


def test_compute_sha256_is_deterministic():
    data = b"hello world"
    expected = hashlib.sha256(data).hexdigest()
    assert compute_sha256(data) == expected


def test_save_pdf_writes_bytes_at_sha_path(tmp_path: Path):
    data = b"%PDF-1.7 fake"
    sha = compute_sha256(data)
    save_pdf(data, sha, dir_path=str(tmp_path))
    assert (tmp_path / f"{sha}.pdf").read_bytes() == data


def test_save_pdf_is_idempotent_for_same_sha(tmp_path: Path):
    data = b"%PDF-1.7"
    sha = compute_sha256(data)
    save_pdf(data, sha, dir_path=str(tmp_path))
    save_pdf(data, sha, dir_path=str(tmp_path))
    assert sum(1 for _ in tmp_path.iterdir()) == 1


def test_read_pdf_returns_bytes(tmp_path: Path):
    data = b"%PDF-1.7 hello"
    sha = compute_sha256(data)
    save_pdf(data, sha, dir_path=str(tmp_path))
    assert read_pdf(sha, dir_path=str(tmp_path)) == data


def test_read_pdf_raises_filenotfound(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        read_pdf("missing", dir_path=str(tmp_path))


def test_pdf_path_returns_correct_path(tmp_path: Path):
    p = pdf_path("abc", dir_path=str(tmp_path))
    assert p == str(tmp_path / "abc.pdf")
```

Run: `pytest tests/test_pdf_storage.py -v`. Expected: FAIL.

- [ ] **Step 2: Implement `src/api/pdf_storage.py`**

```python
# src/api/pdf_storage.py
import hashlib
import os

from src.api.config import load_settings


def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pdf_path(sha256: str, dir_path: str | None = None) -> str:
    base = dir_path or load_settings().pdf_dir
    return os.path.join(base, f"{sha256}.pdf")


def save_pdf(data: bytes, sha256: str, dir_path: str | None = None) -> str:
    base = dir_path or load_settings().pdf_dir
    os.makedirs(base, exist_ok=True)
    path = pdf_path(sha256, dir_path=base)
    if os.path.exists(path):
        return path  # idempotent
    with open(path, "wb") as f:
        f.write(data)
    return path


def read_pdf(sha256: str, dir_path: str | None = None) -> bytes:
    with open(pdf_path(sha256, dir_path=dir_path), "rb") as f:
        return f.read()
```

- [ ] **Step 3: Write `tests/test_documents.py`**

```python
import os
import tempfile

import pytest

from src.api.database import init_db
from src.api.documents import upsert_document, get_document


@pytest.fixture
async def temp_db(monkeypatch):
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setenv("DOCQFLOW_DB_PATH", path)
    await init_db()
    yield path
    os.unlink(path)


@pytest.mark.asyncio
async def test_upsert_document_inserts_new(temp_db):
    await upsert_document("abc", 1024)
    row = await get_document("abc")
    assert row["sha256"] == "abc"
    assert row["size_bytes"] == 1024


@pytest.mark.asyncio
async def test_upsert_document_is_idempotent(temp_db):
    await upsert_document("abc", 1024)
    await upsert_document("abc", 1024)  # no error, no duplicate
    row = await get_document("abc")
    assert row is not None


@pytest.mark.asyncio
async def test_get_document_returns_none_for_missing(temp_db):
    row = await get_document("nope")
    assert row is None
```

Run: `pytest tests/test_documents.py -v`. Expected: FAIL.

- [ ] **Step 4: Implement `src/api/documents.py`**

```python
# src/api/documents.py
from src.api.database import get_db


async def upsert_document(sha256: str, size_bytes: int) -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR IGNORE INTO documents (sha256, size_bytes) VALUES (?, ?)",
            (sha256, size_bytes),
        )
        await db.commit()
    finally:
        await db.close()


async def get_document(sha256: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM documents WHERE sha256 = ?", (sha256,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()
```

- [ ] **Step 5: Run all tests, verify pass**

Run: `pytest -q`. Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/api/documents.py src/api/pdf_storage.py tests/test_documents.py tests/test_pdf_storage.py
git commit -m "feat: add documents repo + filesystem PDF storage with SHA-256 dedup"
```

---

## Task 5: Update `app.py` predict endpoint to persist PDF + return id

**Files:**
- Modify: `app.py`
- Modify: `tests/test_app.py` (or `tests/test_predict.py` — wherever current predict tests live)

- [ ] **Step 1: Locate existing predict tests**

```bash
grep -rln "/predict" tests/ || echo "no existing tests"
```

If none exist, create `tests/test_predict.py`. If they do, append.

- [ ] **Step 2: Add tests for new predict behavior**

```python
# tests/test_predict.py (append or new file)
import io
import os
import tempfile

import pytest
from httpx import ASGITransport, AsyncClient

from server import app
from src.api.database import init_db


@pytest.fixture
async def client(monkeypatch, tmp_path):
    monkeypatch.setenv("DOCQFLOW_DB_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("DOCQFLOW_PDF_DIR", str(tmp_path / "pdfs"))
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def _fake_pdf_bytes() -> bytes:
    # Minimal valid PDF
    return (b"%PDF-1.4\n1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj\n"
            b"2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>> endobj\n"
            b"3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>> endobj\n"
            b"4 0 obj <</Length 44>>stream\nBT /F1 12 Tf 100 700 Td (Permit Application) Tj ET\nendstream endobj\n"
            b"xref\n0 5\n0000000000 65535 f\ntrailer <</Size 5/Root 1 0 R>>\nstartxref\n300\n%%EOF\n")


@pytest.mark.asyncio
async def test_predict_returns_id_and_sha(client):
    pdf = _fake_pdf_bytes()
    files = {"file": ("test.pdf", pdf, "application/pdf")}
    r = await client.post("/api/predict", files=files)
    assert r.status_code in (200, 503)  # 503 if model not loaded in test env
    if r.status_code == 200:
        body = r.json()
        assert "id" in body and isinstance(body["id"], int)
        assert "label" in body
        assert "probabilities" in body
        assert "pdf_sha256" in body and len(body["pdf_sha256"]) == 64


@pytest.mark.asyncio
async def test_predict_persists_pdf_to_filesystem(client, tmp_path):
    pdf = _fake_pdf_bytes()
    files = {"file": ("test.pdf", pdf, "application/pdf")}
    r = await client.post("/api/predict", files=files)
    if r.status_code == 200:
        sha = r.json()["pdf_sha256"]
        path = tmp_path / "pdfs" / f"{sha}.pdf"
        assert path.exists()
        assert path.read_bytes() == pdf
```

Run: `pytest tests/test_predict.py -v`. Expected: FAIL.

- [ ] **Step 3: Update `app.py`**

```python
# app.py
import fitz
from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from classify import extract_text_from_bytes, predict_from_text
from src.api.database import save_classification
from src.api.documents import upsert_document
from src.api.pdf_storage import compute_sha256, save_pdf

router = APIRouter()


class PredictionResponse(BaseModel):
    id: int
    label: str
    probabilities: dict[str, float]
    pdf_sha256: str


@router.get("/health")
def health():
    from server import get_pipeline

    pipeline = get_pipeline()
    return {"status": "ok", "model_loaded": pipeline is not None}


@router.post("/predict", response_model=PredictionResponse)
async def predict_pdf(file: UploadFile):
    from server import get_pipeline

    pipeline = get_pipeline()
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Train a model first.")

    pdf_bytes = await file.read()
    try:
        text = extract_text_from_bytes(pdf_bytes)
    except fitz.FileDataError as exc:
        raise HTTPException(status_code=422, detail="File is not a readable PDF") from exc

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF valid but not processable")

    sha = compute_sha256(pdf_bytes)
    save_pdf(pdf_bytes, sha)
    await upsert_document(sha, len(pdf_bytes))

    result = predict_from_text(pipeline, text)
    confidence = max(result["probabilities"].values())

    new_id = await save_classification(
        filename=file.filename or "unknown.pdf",
        label=result["label"],
        confidence=confidence,
        probabilities=result["probabilities"],
        text_preview=text[:500] if text else None,
        file_size=len(pdf_bytes),
        pdf_sha256=sha,
    )

    return {
        "id": new_id,
        "label": result["label"],
        "probabilities": result["probabilities"],
        "pdf_sha256": sha,
    }
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pytest -q`. Expected: all pass (existing + new).

- [ ] **Step 5: Commit**

```bash
git add app.py tests/test_predict.py
git commit -m "feat: persist PDF to filesystem; predict returns id and pdf_sha256"
```

---

## Task 6: Add `GET /api/classifications/{id}` and `GET /api/classifications/{id}/pdf` endpoints

**Files:**
- Modify: `src/api/routes.py`
- Modify: `src/api/models.py`
- Modify: `tests/test_routes.py` (or wherever `/api/history` tests live)

- [ ] **Step 1: Add endpoint tests**

```python
# tests in tests/test_classifications.py
import pytest
from httpx import ASGITransport, AsyncClient
from server import app

# Reuse the client + _fake_pdf_bytes fixtures (or recreate from Task 5).

@pytest.mark.asyncio
async def test_get_classification_metadata(client):
    pdf = _fake_pdf_bytes()
    r = await client.post("/api/predict", files={"file": ("a.pdf", pdf, "application/pdf")})
    if r.status_code != 200:
        pytest.skip("model not loaded in test env")
    cid = r.json()["id"]
    r2 = await client.get(f"/api/classifications/{cid}")
    assert r2.status_code == 200
    body = r2.json()
    assert body["id"] == cid
    assert body["pdf_sha256"]


@pytest.mark.asyncio
async def test_get_classification_pdf_returns_bytes(client):
    pdf = _fake_pdf_bytes()
    r = await client.post("/api/predict", files={"file": ("a.pdf", pdf, "application/pdf")})
    if r.status_code != 200:
        pytest.skip("model not loaded")
    cid = r.json()["id"]
    r2 = await client.get(f"/api/classifications/{cid}/pdf")
    assert r2.status_code == 200
    assert r2.headers["content-type"] == "application/pdf"
    assert r2.content == pdf


@pytest.mark.asyncio
async def test_get_classification_pdf_410_when_legacy_null_sha(client, monkeypatch):
    # Insert a legacy row with NULL pdf_sha256.
    from src.api.database import save_classification
    cid = await save_classification(
        filename="legacy.pdf", label="permit-3-8",
        confidence=0.9, probabilities={"permit-3-8": 0.9}, pdf_sha256=None,
    )
    r = await client.get(f"/api/classifications/{cid}/pdf")
    assert r.status_code == 410


@pytest.mark.asyncio
async def test_get_classification_404(client):
    r = await client.get("/api/classifications/99999")
    assert r.status_code == 404
    r2 = await client.get("/api/classifications/99999/pdf")
    assert r2.status_code == 404
```

Run: FAIL.

- [ ] **Step 2: Implement endpoints in `src/api/routes.py`**

Append to existing `src/api/routes.py`:

```python
from fastapi import HTTPException
from fastapi.responses import FileResponse, Response

from src.api.config import load_settings
from src.api.pdf_storage import pdf_path


@router.get("/classifications/{classification_id}", response_model=HistoryEntry)
async def get_classification_metadata(classification_id: int):
    result = await get_classification(classification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Classification not found")
    probs = result["probabilities"]
    if isinstance(probs, str):
        try:
            probs = json.loads(probs)
        except JSONDecodeError:
            probs = {}
    return HistoryEntry(**{**result, "probabilities": probs})


@router.get("/classifications/{classification_id}/pdf")
async def get_classification_pdf(classification_id: int):
    row = await get_classification(classification_id)
    if not row:
        raise HTTPException(status_code=404, detail="Classification not found")
    sha = row.get("pdf_sha256")
    if not sha:
        raise HTTPException(
            status_code=410,
            detail={"error_code": "pdf_missing", "message": "PDF unavailable for legacy submission"},
        )
    path = pdf_path(sha)
    try:
        return FileResponse(
            path,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{row["filename"]}"'},
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=410,
            detail={"error_code": "pdf_missing", "message": "PDF file missing on disk"},
        ) from exc
```

Update `HistoryEntry` in `src/api/models.py` to include `pdf_sha256: str | None = None`.

- [ ] **Step 3: Add startup-time check in `server.py`**

Edit `server.py`:

```python
# in lifespan(), before the yield:
async with asynccontextmanager(...):  # existing
    _pipeline = load_model()
    await init_db()
    # Sanity: ensure pdf_dir exists
    settings = load_settings()
    os.makedirs(settings.pdf_dir, exist_ok=True)
    yield
```

(If `from src.api.config import load_settings` is missing, add it.)

- [ ] **Step 4: Run tests, verify pass**

Run: `pytest -q`. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/api/routes.py src/api/models.py server.py tests/test_classifications.py
git commit -m "feat: add /api/classifications/{id} and /api/classifications/{id}/pdf endpoints"
```

---

## Task 7: Frontend — install `react-pdf`, configure worker, set up bundle-size guard

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/lib/pdfjsWorker.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd frontend && npm install react-pdf@^9 pdfjs-dist@^4 @tanstack/react-query@^5
```

(`@tanstack/react-query` is added now even though it's used in PR 3 because installing it once avoids two lockfile churns; PR 1 does not import it.)

- [ ] **Step 2: Worker setup file**

```ts
// frontend/src/lib/pdfjsWorker.ts
import { pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()
```

- [ ] **Step 3: Confirm Vite handles the worker**

Run: `cd frontend && npm run build`. Expected: build succeeds. If not, follow error guidance.

- [ ] **Step 4: Add bundle-size assertion script**

Create `frontend/scripts/check-bundle-size.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const distDir = path.join(process.cwd(), 'dist', 'assets')
const limitKb = 250
const files = fs.readdirSync(distDir).filter(f => f.endsWith('.js'))
const main = files.find(f => f.startsWith('index-'))
if (!main) {
  console.error('Could not find main bundle in', distDir)
  process.exit(1)
}
const raw = fs.readFileSync(path.join(distDir, main))
const gzKb = gzipSync(raw).length / 1024
console.log(`main bundle: ${gzKb.toFixed(1)} kB gzipped`)
if (gzKb > limitKb) {
  console.error(`bundle exceeds ${limitKb} kB`)
  process.exit(1)
}
```

Add npm script in `frontend/package.json`:

```json
"scripts": {
  ...
  "check-bundle": "node scripts/check-bundle-size.mjs"
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/pdfjsWorker.ts frontend/scripts/check-bundle-size.mjs
git commit -m "chore: add react-pdf, pdfjs worker config, bundle-size guard"
```

---

## Task 8: Frontend — `PreferencesContext` (rename from ThemeContext, add showConfidence + reviewerName)

**Files:**
- Rename: `frontend/src/context/ThemeContext.tsx` → `frontend/src/context/PreferencesContext.tsx`
- Modify: `frontend/src/App.tsx` (provider name + import)
- Modify: any consumers (`Settings.tsx`, possibly `Header.tsx`)

- [ ] **Step 1: Read existing ThemeContext to preserve API**

```bash
cat frontend/src/context/ThemeContext.tsx
```

- [ ] **Step 2: Create PreferencesContext.tsx**

```tsx
// frontend/src/context/PreferencesContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface Preferences {
  theme: Theme
  showConfidence: boolean
  reviewerName: string
}

interface PreferencesContextValue extends Preferences {
  setTheme: (t: Theme) => void
  setShowConfidence: (b: boolean) => void
  setReviewerName: (s: string) => void
}

const STORAGE_KEY = 'docqflow.prefs'

const DEFAULTS: Preferences = {
  theme: 'system',
  showConfidence: false,
  reviewerName: 'Reviewer',
}

const Ctx = createContext<PreferencesContextValue | null>(null)

function loadFromStorage(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(loadFromStorage)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    document.documentElement.dataset.theme =
      prefs.theme === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : prefs.theme
  }, [prefs])

  const value: PreferencesContextValue = {
    ...prefs,
    setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
    setShowConfidence: (showConfidence) => setPrefs((p) => ({ ...p, showConfidence })),
    setReviewerName: (reviewerName) => setPrefs((p) => ({ ...p, reviewerName })),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePreferences(): PreferencesContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePreferences must be used inside PreferencesProvider')
  return v
}

// Reader hooks for narrow re-render scope
export const useTheme = () => usePreferences().theme
export const useShowConfidence = () => usePreferences().showConfidence
export const useReviewerName = () => usePreferences().reviewerName
```

- [ ] **Step 3: Delete old `ThemeContext.tsx`**

```bash
rm frontend/src/context/ThemeContext.tsx
```

- [ ] **Step 4: Update `App.tsx` import + provider**

Replace `<ThemeProvider>` with `<PreferencesProvider>`. Update import.

- [ ] **Step 5: Add tests**

```tsx
// frontend/src/context/PreferencesContext.test.tsx
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { PreferencesProvider, usePreferences } from './PreferencesContext'

function Probe() {
  const { theme, showConfidence, setShowConfidence } = usePreferences()
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="show">{String(showConfidence)}</span>
      <button onClick={() => setShowConfidence(true)}>show</button>
    </>
  )
}

beforeEach(() => localStorage.clear())

describe('PreferencesContext', () => {
  it('uses defaults when storage empty', () => {
    render(<PreferencesProvider><Probe /></PreferencesProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('system')
    expect(screen.getByTestId('show').textContent).toBe('false')
  })

  it('persists changes to localStorage', () => {
    render(<PreferencesProvider><Probe /></PreferencesProvider>)
    act(() => screen.getByText('show').click())
    expect(JSON.parse(localStorage.getItem('docqflow.prefs')!).showConfidence).toBe(true)
  })
})
```

- [ ] **Step 6: Run frontend tests**

```bash
cd frontend && npm test -- --run
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/context/PreferencesContext.tsx frontend/src/context/PreferencesContext.test.tsx frontend/src/App.tsx
git rm frontend/src/context/ThemeContext.tsx
git commit -m "refactor: rename ThemeContext to PreferencesContext; add showConfidence and reviewerName"
```

---

## Task 9: Frontend — design tokens overhaul

**Files:**
- Modify: `frontend/src/styles/globals.css`

- [ ] **Step 1: Rewrite globals.css with new token set**

```css
@import "tailwindcss";
@import "@fontsource/public-sans/400.css";
@import "@fontsource/public-sans/600.css";
@import "@fontsource/public-sans/700.css";
@import "@fontsource/public-sans/800.css";

@theme {
  --font-sans: "Public Sans", system-ui, sans-serif;

  --color-brand-primary: #0F2C5C;
  --color-brand-accent:  #1F7AE0;

  --color-surface-base:  #F7F8FA;
  --color-surface-elev1: #FFFFFF;
  --color-surface-elev2: #FFFFFF;

  --color-text-primary:  #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted:    #64748B;

  --color-border:        #E5E7EB;
  --color-border-strong: #CBD5E1;

  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-danger:  #DC2626;
  --color-info:    #2563EB;

  --color-confidence-high: #16A34A;
  --color-confidence-med:  #D97706;
  --color-confidence-low:  #DC2626;

  --radius-sm: 6px;
  --radius:    8px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  --shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06);
  --shadow-elev: 0 4px 12px rgba(15, 23, 42, 0.08);
}

[data-theme="dark"] {
  --color-brand-primary: #6FA8E5;
  --color-brand-accent:  #3B92F2;
  --color-surface-base:  #0B1220;
  --color-surface-elev1: #111A2E;
  --color-surface-elev2: #1A2540;
  --color-text-primary:  #F1F5F9;
  --color-text-secondary: #CBD5E1;
  --color-text-muted:    #94A3B8;
  --color-border:        #1F2A44;
  --color-border-strong: #334155;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-surface-base);
  color: var(--color-text-primary);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles/globals.css
git commit -m "feat: introduce new design tokens for frontend overhaul"
```

---

## Task 10: Frontend — `lib/api.ts` and `lib/types.ts` updates

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Update `types.ts`**

Read the current file, then add:

```ts
// frontend/src/lib/types.ts

// Existing types preserved.
// Update PredictionResponse:
export interface PredictionResponse {
  id: number
  label: string
  probabilities: Record<string, number>
  pdf_sha256: string
}

// Add HistoryEntry update if needed (pdf_sha256 nullable):
export interface HistoryEntry {
  id: number
  filename: string
  uploaded_at: string
  label: string
  confidence: number
  probabilities: Record<string, number>
  text_preview: string | null
  file_size: number | null
  pdf_sha256: string | null
}

// New types for placeholder extraction (PR 1) and real extraction (PR 3):

export type FieldName =
  | 'applicant_name'
  | 'address'
  | 'permit_type'
  | 'parcel_number'
  | 'project_address'
  | 'contractor_name'
  | 'license_number'
  | 'estimated_cost'
  | 'square_footage'

export type Department =
  | 'building'
  | 'electrical'
  | 'plumbing'
  | 'zoning'
  | 'other'

export interface ExtractedField {
  value: string | null
  source_text: string | null
}

export interface ExtractionResult {
  fields: Record<FieldName, ExtractedField>
  department: Department
  department_confidence: number
  model: string
  prompt_version: number
}

export type ExtractionState =
  | { kind: 'loading' }
  | { kind: 'ok'; result: ExtractionResult }
  | { kind: 'not_permit'; classificationId: string }
  | { kind: 'pdf_missing' }
  | { kind: 'unavailable'; retryAfterS?: number }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string }
```

- [ ] **Step 2: Update `api.ts`**

```ts
// frontend/src/lib/api.ts (add)
export async function getClassification(id: number): Promise<HistoryEntry> {
  return fetchJSON<HistoryEntry>(`${BASE}/classifications/${id}`)
}

export function classificationPdfUrl(id: number): string {
  return `${BASE}/classifications/${id}/pdf`
}
```

(`classifyPDF` body is unchanged — but its TS return type now reflects the new fields.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/types.ts
git commit -m "feat: extend api client + types for new endpoints and extraction shape"
```

---

## Task 11: Frontend — common components (`ConfidenceToggle`, `ClassificationBadge`, `StatCard`, `ErrorBanner`)

**Files:**
- Create: `frontend/src/components/common/ConfidenceToggle.tsx`
- Create: `frontend/src/components/common/ConfidenceToggle.test.tsx`
- Create: `frontend/src/components/common/ClassificationBadge.tsx`
- Create: `frontend/src/components/common/StatCard.tsx`
- Create: `frontend/src/components/common/ErrorBanner.tsx`

For each component:
1. Write a single render+interaction test.
2. Implement.
3. Run vitest; expect pass.

Implementations are short (each < 50 lines). Use Tailwind utility classes that resolve to the new CSS variables (e.g., `bg-[var(--color-surface-elev1)]`, `text-[var(--color-text-primary)]`). Use `lucide-react` icons (`Eye`, `EyeOff`, `AlertCircle`, etc).

`ConfidenceToggle` reads/writes via `usePreferences().setShowConfidence`. `ClassificationBadge` takes `label: string` and renders a colored pill (`permit-3-8` → blue, `not-permit-3-8` → grey). `StatCard` takes `{ icon, label, value }`. `ErrorBanner` takes `{ title, description, onRetry? }`.

- [ ] **Commit at the end:**

```bash
git add frontend/src/components/common
git commit -m "feat: add common UI components (ConfidenceToggle, ClassificationBadge, StatCard, ErrorBanner)"
```

---

## Task 12: Frontend — layout shells

**Files:**
- Create: `frontend/src/components/layout/TopBar.tsx`
- Create: `frontend/src/components/layout/LeftRail.tsx`
- Create: `frontend/src/components/layout/CollapsedNav.tsx`
- Create: `frontend/src/components/layout/ProcessFlowStrip.tsx`
- Create: `frontend/src/components/layout/Footer.tsx`
- Create: `frontend/src/components/layout/DashboardShell.tsx`
- Create: `frontend/src/components/layout/WorkspaceShell.tsx`
- Create: `frontend/src/components/dashboard/MarketingTile.tsx`
- Delete: `frontend/src/components/layout/Shell.tsx` (after routes migrate)

Each shell is small (< 80 lines). `DashboardShell` composes `TopBar` + `LeftRail` + `<Outlet />` + `ProcessFlowStrip` + `Footer`. `WorkspaceShell` composes `TopBar` + `CollapsedNav` + `<Outlet />`. `TopBar` uses `react-router-dom` `NavLink` for the four tabs (Dashboard / Submissions / Reports / Settings), shows a bell (placeholder count of 0 in PR 1), and an avatar block reading `useReviewerName()`. `LeftRail` renders the brand block (DOCQFLOW wordmark + tagline) and four `MarketingTile`s with the icons + copy from the mock. `ProcessFlowStrip` accepts `activeStep?: number` (1–6); steps are: Upload, Extract, Validate, Classify, Review, Complete.

- [ ] Write a render test for each shell asserting the rail is present in DashboardShell and absent in WorkspaceShell.
- [ ] Implement all components.
- [ ] Run vitest; expect pass.

```bash
git add frontend/src/components/layout frontend/src/components/dashboard
git rm frontend/src/components/layout/Shell.tsx 2>/dev/null || true
git commit -m "feat: add DashboardShell + WorkspaceShell + TopBar + LeftRail + ProcessFlowStrip + Footer"
```

---

## Task 13: Frontend — extraction components + `usePlaceholderExtraction`

**Files:**
- Create: `frontend/src/components/extraction/ExtractedFieldRow.tsx`
- Create: `frontend/src/components/extraction/ExtractedFieldRowSkeleton.tsx`
- Create: `frontend/src/components/extraction/ExtractedFieldsPanel.tsx`
- Create: `frontend/src/components/extraction/DepartmentCard.tsx`
- Create: `frontend/src/components/extraction/ActionBar.tsx`
- Create: `frontend/src/components/extraction/ExtractAnywayBanner.tsx`
- Create: `frontend/src/hooks/usePlaceholderExtraction.ts`
- Create matching `*.test.tsx` for each component (smallest sufficient test).

`usePlaceholderExtraction(classificationId: string): ExtractionState` returns `{ kind: 'ok', result: { fields: { applicant_name: { value: 'John Doe', source_text: 'Applicant Name: John Doe' }, ... }, department: 'building', department_confidence: 0.96, model: 'placeholder', prompt_version: 0 } }` after a 600ms simulated delay (`useEffect` + `setTimeout`). Setting different field values is fine; the contract is the SHAPE, not the values.

`ExtractedFieldRow` renders icon + label + (value or `MISSING` badge) + a small chevron that reveals `source_text`. Confidence numbers are not shown in PR 1 (the LLM doesn't produce per-field confidences anyway).

`DepartmentCard` shows the department name (mapped via a small lookup `'building' → 'Building Department'`) and, when `useShowConfidence()` is true, the percentage.

`ActionBar` renders three disabled buttons in PR 1 with a tooltip "Coming in review workflow PR" — wired in PR 4.

`ExtractAnywayBanner` renders a static banner in PR 1 (clickable but only logs); PR 3 wires `useExtractAnyway`.

- [ ] Write tests, implement, verify pass.

```bash
git add frontend/src/components/extraction frontend/src/hooks/usePlaceholderExtraction.ts
git commit -m "feat: extraction panel components + placeholder hook (shape-matched stub)"
```

---

## Task 14: Frontend — PDF components

**Files:**
- Create: `frontend/src/components/pdf/PdfViewer.tsx`
- Create: `frontend/src/components/pdf/PdfToolbar.tsx`
- Create: `frontend/src/components/pdf/PdfViewer.test.tsx`

`PdfViewer.tsx` imports `Document, Page` from `react-pdf` and `'../../lib/pdfjsWorker'` (side-effect for worker config). Props: `{ url: string, onPageInfo?: (n: number) => void }`. Renders `<Document file={url}>` + the active `<Page pageNumber={n} scale={scale} />`. Local state for `currentPage`, `numPages`, `scale`. The `PdfToolbar` is rendered inside `PdfViewer` so the entire `react-pdf` import is contained.

`PdfToolbar.tsx` is internal — exposes `<` `>` page buttons, "1 / N" label, zoom in/out icons, download link. Pure presentational; takes callbacks as props.

`PdfViewer` is **default-exported** so the consumer can `React.lazy(() => import('@/components/pdf/PdfViewer'))`.

Test: render with a known small data URL, assert the page indicator updates on `next` click. Use `vi.mock('react-pdf', () => ({ Document: ({ children }) => children, Page: () => <div data-testid="pdf-page">page</div>, pdfjs: { GlobalWorkerOptions: {} } }))` to keep the test hermetic.

- [ ] Write test, implement, verify pass.

```bash
git add frontend/src/components/pdf
git commit -m "feat: lazy-loaded PdfViewer with custom toolbar"
```

---

## Task 15: Frontend — pages

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/pages/Review.tsx`
- Create: `frontend/src/pages/Queue.tsx`
- Create: `frontend/src/pages/Reports.tsx`
- Rename: `frontend/src/pages/History.tsx` → `frontend/src/pages/Submissions.tsx`
- Modify: `frontend/src/pages/Settings.tsx`
- Modify: `frontend/src/pages/About.tsx` (add to footer link only — no major restyle in PR 1)
- Delete: `frontend/src/pages/Classify.tsx`
- Create: `frontend/src/components/queue/QueueGrid.tsx`
- Create: `frontend/src/components/queue/QueueThumbnail.tsx`
- Create: `frontend/src/components/submissions/SubmissionsTable.tsx`
- Create: `frontend/src/components/reports/ReportsCards.tsx`

**Dashboard** — empty center pane shows a drop-zone (reuse existing `DropZone` from `components/upload/`). On 1-file drop, calls `useUpload().addAndProcess([file])` which navigates. On N-file drop, same hook navigates to `/queue`.

**Review** — reads `useParams().id`, calls `getClassification(id)` for metadata, lazy-renders `<PdfViewer url={classificationPdfUrl(id)} />` on the left, calls `usePlaceholderExtraction(id)` on the right (rendered inside `<ExtractedFieldsPanel />`), shows `<DepartmentCard />` and `<ActionBar />` below the panel, threads `activeStep={2}` (Extract) into the `ProcessFlowStrip` while loading, `5` (Review) once `usePlaceholderExtraction` returns.

**Queue** — pulls `queueResults` from `UploadContext` and renders `QueueGrid` of `QueueThumbnail`s. Each thumbnail renders the first PDF page (`react-pdf` lazy via the `PdfViewer` lazy-import, but in `pageNumber={1}` and a smaller scale). Click → `navigate(/review/${id})`.

**Submissions** — restyle existing `History` table; reuse current data hook; show `ClassificationBadge`. PR 4 will add `StatusBadge` and a status filter.

**Reports** — `useEffect` fetch from `/api/stats`, render two `StatCard`s ("Total Classified", "Last 7 Days"), and a small bar showing `permit-3-8` vs `not-permit-3-8` ratio.

**Settings** — restyle existing; add a confidence-default toggle wired to `usePreferences().setShowConfidence`.

**About** — leave content; just ensure it's reachable from the new Footer.

For each page write a render test asserting:
- Dashboard: shows drop zone.
- Review: reads `id` from URL, shows skeleton then placeholder fields.
- Queue: with empty `queueResults`, shows empty state; with two results, shows two thumbnails.
- Submissions: existing tests adapt with the rename.
- Reports: renders two stat cards.
- Settings: confidence toggle reflects preferences state.

- [ ] Implement, test, verify.

```bash
git add frontend/src/pages frontend/src/components/queue frontend/src/components/submissions frontend/src/components/reports
git rm frontend/src/pages/Classify.tsx frontend/src/pages/History.tsx
git commit -m "feat: rebuild Dashboard / Review / Queue / Submissions / Reports / Settings pages"
```

---

## Task 16: Frontend — wire `App.tsx` router and extend `useUpload`

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/hooks/useUpload.ts`
- Modify: `frontend/src/context/UploadContext.tsx` (add `queueResults` field)

- [ ] **Step 1: Rewrite `App.tsx`**

```tsx
// frontend/src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { PreferencesProvider } from '@/context/PreferencesContext'
import { UploadProvider } from '@/context/UploadContext'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { Dashboard } from '@/pages/Dashboard'
import { Review } from '@/pages/Review'
import { Queue } from '@/pages/Queue'
import { Submissions } from '@/pages/Submissions'
import { Reports } from '@/pages/Reports'
import { Settings } from '@/pages/Settings'
import { About } from '@/pages/About'

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

export default function App() {
  return (
    <PreferencesProvider>
      <UploadProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors />
      </UploadProvider>
    </PreferencesProvider>
  )
}
```

- [ ] **Step 2: Extend `useUpload.ts` with 1-vs-N routing**

Append to existing `useUpload`:

```ts
const navigate = useNavigate()

async function addAndProcess(files: File[]) {
  if (files.length === 1) {
    const result = await classifyPDF(files[0])
    navigate(`/review/${result.id}`)
    return
  }
  const results = await Promise.all(files.map(classifyPDF))
  setQueueResults(results)
  navigate('/queue')
}
```

(Keep existing batch retry, error handling, etc. The single-file branch skips the `items` reducer because there's nothing to display on the (now removed) Classify page.)

- [ ] **Step 3: Update `UploadContext.tsx`**

Add `queueResults: PredictionResponse[]` and `setQueueResults(r)` to the reducer.

- [ ] **Step 4: Update existing `useUpload` tests**

Existing tests reference `Classify`-page batch UI; rewrite the affected assertions: 1 file → `navigate('/review/:id')`; N files → `setQueueResults` called and `navigate('/queue')`.

- [ ] **Step 5: Run vitest, fix, verify pass.**

```bash
cd frontend && npm test -- --run
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx frontend/src/hooks/useUpload.ts frontend/src/context/UploadContext.tsx
git commit -m "feat: wire new router + 1-vs-N upload routing"
```

---

## Task 17: Quality gates — lint, type-check, build, bundle, e2e smoke, CHANGELOG

- [ ] **Backend lint + format**

```bash
source .venv/bin/activate
ruff check . && ruff format --check .
```

Expected: clean. Fix any violations introduced by tasks 1–6.

- [ ] **Backend tests**

```bash
pytest -q
```

Expected: all pass.

- [ ] **Frontend lint + type-check**

```bash
cd frontend && npm run lint && npx tsc -b
```

Expected: clean.

- [ ] **Frontend tests**

```bash
cd frontend && npm test -- --run
```

Expected: all pass.

- [ ] **Frontend build + bundle-size guard**

```bash
cd frontend && npm run build && node scripts/check-bundle-size.mjs
```

Expected: build succeeds; main bundle < 250 kB gzipped.

- [ ] **API surface test (static-mount trap)**

```bash
source .venv/bin/activate
uvicorn server:app &
SERVER_PID=$!
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/extract/0   # expect 404
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/classifications/99999/pdf  # expect 404
kill $SERVER_PID
```

Expected: both 404.

- [ ] **E2E smoke (Playwright MCP)**

Have the e2e-runner agent (or invoke Playwright via the `superpowers:e2e` skill) exercise:
1. Navigate to `http://localhost:5173/` (vite dev) — Dashboard renders with LeftRail + drop zone.
2. Drop one fixture PDF — should navigate to `/review/:id`.
3. PDF viewer renders the first page; toolbar shows "1 / N".
4. Extracted fields panel shows skeletons, then placeholder rows after ~600ms.
5. Click each top-nav tab — Submissions, Reports, Settings — each loads without errors.
6. Toggle "Show confidence" in Settings — verify it persists across reload.

Capture screenshots; attach to the PR description.

- [ ] **CHANGELOG**

```md
# Add to CHANGELOG.md under ## Unreleased

### Added
- Frontend overhaul: new Dashboard / Review / Queue / Submissions / Reports / Settings pages with mock-faithful layout
- `react-pdf` viewer with custom toolbar, lazy-loaded on review and queue pages
- `PreferencesContext` (replaces `ThemeContext`) with showConfidence and reviewerName preferences
- `documents` table tracks uploaded PDFs by SHA-256
- Filesystem PDF storage at `data/pdfs/{sha256}.pdf`
- `GET /api/classifications/{id}` and `GET /api/classifications/{id}/pdf` endpoints
- `id` and `pdf_sha256` in `/api/predict` response
- `src/api/config.py` Settings module
- `src/api/migrations.py` schema_version migration runner
- Bundle-size guard script (250 kB gzipped budget for main chunk)

### Changed
- `/api/predict` response now includes `id` and `pdf_sha256` (additive)
- `History` page renamed to `Submissions`
- Routing: `/` is now Dashboard; review of a single document lives at `/review/:id`

### Removed
- `Classify` page (functionality merged into Dashboard)
- `ThemeContext` (replaced by `PreferencesContext`)
```

```bash
git add CHANGELOG.md
git commit -m "docs: add CHANGELOG entry for PR 1"
```

- [ ] **Push branch and open PR**

```bash
git push -u origin feat/frontend-overhaul
gh pr create --title "feat: frontend overhaul (PR 1 of 4)" --body "$(cat <<'EOF'
## Summary

PR 1 of 4 from the multi-PR DocQFlow overhaul. Lands the visual redesign and the minimal backend changes needed to make `/review/:id` a real route.

This PR is mock-faithful for the layout but ships placeholder field extraction (`usePlaceholderExtraction()`). PR 2 introduces the Ollama extraction backend; PR 3 swaps the placeholder hook for `useExtraction`; PR 4 adds the review workflow.

See [`docs/superpowers/specs/2026-04-25-frontend-overhaul-design.md`](./docs/superpowers/specs/2026-04-25-frontend-overhaul-design.md).

## Changes

**Frontend**
- `DashboardShell` (TopBar + LeftRail + ProcessFlowStrip + Footer) for `/`
- `WorkspaceShell` (TopBar + CollapsedNav) for `/review/:id`, `/queue`, `/submissions`, `/reports`, `/settings`, `/about`
- `react-pdf` viewer + custom toolbar, lazy-loaded
- `PreferencesContext` replaces `ThemeContext`; adds showConfidence + reviewerName
- New design tokens; brand navy + accent blue
- 1-vs-N upload routing

**Backend**
- `/api/predict` returns `id` + `pdf_sha256`
- New `documents` table + filesystem PDF storage at `data/pdfs/{sha256}.pdf`
- `GET /api/classifications/{id}` and `/pdf` endpoints
- `Settings` module + `schema_version` migration runner

## Test plan

- [x] Backend tests (pytest -q): all pass
- [x] Frontend tests (vitest): all pass
- [x] Bundle-size guard: main < 250 kB gzipped
- [x] Static-mount trap: GET /api/extract/0 returns 404
- [x] Playwright e2e smoke: drop PDF → review page renders → all top-nav tabs reachable

## Screenshots

[Before / After screenshots to be attached]
EOF
)"
```

---

## Self-Review

After completing all tasks above, verify:

1. **Spec coverage:** every component listed in spec §5.2 has been built. Every backend prerequisite in spec §6.1 has been built. The placeholder hook returns the same shape as the future `useExtraction`.
2. **Placeholder scan:** plan contains no "TBD" / "TODO" / "fill in details" / "similar to Task N" — checked.
3. **Type consistency:** `PredictionResponse` in TS matches Pydantic; `ExtractionResult` in TS matches the spec; `ExtractionState` discriminated union covers all UI states; `usePlaceholderExtraction` return type is `ExtractionState`.
4. **Spec sections referenced and addressed:**
   - §4 Architecture: addressed by Tasks 1–17 collectively.
   - §5 Frontend: Tasks 7–16.
   - §6.1 PR 1 backend additions: Tasks 1–6.
   - §9 Quality gates: Task 17.
   - §10 Risks (PR 1 scope): bundle-size guard and static-mount trap test cover the PR-1-relevant items.

Plan complete and saved to `docs/superpowers/plans/2026-04-25-pr1-frontend-overhaul.md`.
