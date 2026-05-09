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
    from src.classifier import load_model

    model_path = ROOT / "models" / "model.joblib"
    if not model_path.exists():
        pytest.skip(f"Model not found at {model_path}; train one first.")
    pipeline = load_model(str(model_path))
    if pipeline is None:
        pytest.skip("load_model returned None")
    return pipeline


@pytest.fixture
def client(test_db_path, trained_pipeline):
    """FastAPI TestClient with a temp DB and the real trained pipeline pre-loaded.

    We skip the lifespan (don't enter TestClient as a context manager) because it
    re-loads the model from disk and would clobber our injected pipeline.
    Instead we run init_db() manually against the monkeypatched DB_PATH and stash
    the pipeline on app.state, mirroring what lifespan would have done.
    """
    import asyncio

    from fastapi.testclient import TestClient

    from src import server
    from src.api.database import init_db
    from src.pipeline.gazetteer import Gazetteer

    asyncio.run(init_db())
    server.app.state.pipeline = trained_pipeline
    server.app.state.gazetteer = Gazetteer.load()
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


def _make_form_3_8_widget_pdf(field_values: dict[str, str]) -> bytes:
    """Build a one-page PDF whose AcroForm widgets are named per Form 3-8.

    Widget names mirror the lookup keys in ``src/api/pdf_fields.py``, so a
    round-trip through ``extract_form_3_8_fields`` returns exactly
    ``field_values``. The page itself stays blank — the extractor reads
    widget metadata, not rendered text.
    """
    doc = fitz.open()
    page = doc.new_page()
    y = 72
    for name, value in field_values.items():
        widget = fitz.Widget()
        widget.field_name = name
        widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
        widget.field_value = value
        widget.rect = fitz.Rect(72, y, 360, y + 16)
        page.add_widget(widget)
        y += 24
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture
def filled_form_3_8_pdf_bytes() -> bytes:
    """A synthetic Form 3-8 with every required completeness field populated.

    Replaces a corpus fixture that lived in the gitignored ``data/`` tree.
    Values match the assertions in
    ``test_get_classification_fields_returns_nested_completeness``.
    """
    return _make_form_3_8_widget_pdf(
        {
            "APPLICATION NUMBER": "202604089128",
            "1 STREET ADDRESS OF JOB BLOCK  LOT": "2130 Harrison St #9",
            "1 BLOCK & LOT": "3573/056",
            "2A ESTIMATED COST OF JOB": "$29,100",
            "14 CONTRACTOR": "MINT CONSTRUCTION INC",
            "14C CSLB": "1143205",
        }
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
