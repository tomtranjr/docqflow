"""Shared fixtures for the DocQFlow test suite."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import fitz
import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture
def test_db_path(tmp_path, monkeypatch):
    """Point the database layer at a throwaway SQLite file for the duration of a test."""
    db_file = tmp_path / "test.db"
    monkeypatch.setenv("DOCQFLOW_DB_PATH", str(db_file))
    import src.api.database as database

    monkeypatch.setattr(database, "DB_PATH", str(db_file))
    return db_file


@pytest.fixture
def trained_pipeline():
    """Load the real joblib model if present; otherwise skip tests that need it."""
    from classify import load_model

    model_path = ROOT / "models" / "model.joblib"
    if not model_path.exists():
        pytest.skip(f"Model not found at {model_path}; train one first.")
    pipeline = load_model(str(model_path))
    if pipeline is None:
        pytest.skip("load_model returned None")
    return pipeline


@pytest.fixture
def client(test_db_path, trained_pipeline, monkeypatch):
    """FastAPI TestClient with a temp DB and the real trained pipeline pre-loaded.

    We skip the lifespan (don't enter TestClient as a context manager) because it
    re-loads the model from disk and would clobber our monkeypatched pipeline.
    Instead we run init_db() manually against the monkeypatched DB_PATH.
    """
    import asyncio

    from fastapi.testclient import TestClient

    import server
    from src.api.database import init_db

    asyncio.run(init_db())
    monkeypatch.setattr(server, "_pipeline", trained_pipeline)
    test_client = TestClient(server.app)
    try:
        yield test_client
    finally:
        test_client.close()


def _make_pdf_bytes(text: str) -> bytes:
    """Build a one-page PDF containing the given text."""
    doc = fitz.open()
    page = doc.new_page()
    if text:
        page.insert_text((72, 72), text, fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    return _make_pdf_bytes(
        "City of San Francisco permit application form 3-8 building department "
        "construction scope owner contractor license"
    )


@pytest.fixture
def blank_pdf_bytes() -> bytes:
    """A valid PDF whose page has no extractable text."""
    return _make_pdf_bytes("")


@pytest.fixture
def not_a_pdf_bytes() -> bytes:
    return b"this is not a pdf, just plain text\n"


@pytest.fixture(autouse=True)
def _isolate_cwd(monkeypatch, tmp_path):
    """Run each test with cwd = tmp_path so stray writes don't pollute the repo."""
    monkeypatch.chdir(tmp_path)
    os.makedirs(tmp_path / "data", exist_ok=True)
