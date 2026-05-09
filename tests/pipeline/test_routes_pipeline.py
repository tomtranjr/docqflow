"""Functional tests for POST /api/documents/process.

Mirrors `tests/test_predict_endpoint.py` (sync TestClient) and reuses the
`reason.judge` boundary mock pattern from `tests/pipeline/test_orchestrator.py`
so no live LLM traffic flies during these tests.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from src.pipeline import reason as reason_mod
from src.pipeline.reason import JudgeResponse

CORPUS_PDF = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "permit-3-8"
    / "permit-3-8_correct_202602125866.pdf"
)


@pytest.fixture
def corpus_pdf_bytes() -> bytes:
    """Return bytes of a known-clean corpus PDF; skip if the corpus isn't available."""
    if not CORPUS_PDF.exists():
        pytest.skip(f"corpus PDF not available at {CORPUS_PDF}")
    return CORPUS_PDF.read_bytes()


@pytest.fixture
def mocked_judge(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stub `reason.judge` with a no-op 'ok' response — keeps tests offline."""

    async def fake_judge(profile, *, system, user, schema):
        return JudgeResponse(verdict="ok", confidence=0.9, message="mocked")

    monkeypatch.setattr(reason_mod, "judge", fake_judge)


@pytest.fixture
def reachable_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    """Force the cloud-fast profile reachable so pre-flight passes."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")


def test_process_happy_path(
    client, corpus_pdf_bytes, mocked_judge, reachable_profile
) -> None:
    """A correct-corpus PDF runs Stages 4-6 and returns a full PipelineResult."""
    response = client.post(
        "/api/documents/process",
        files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["llm_profile"] == "cloud-fast"
    assert body["verdict"] in {"clean", "minor", "major"}
    assert isinstance(body["latency_ms"], int)
    assert body["latency_ms"] >= 0
    assert isinstance(body["extracted_fields"], dict)
    assert isinstance(body["issues"], list)
    assert isinstance(body["document_id"], str)


def test_process_rejects_flat_pdf(
    client, sample_pdf_bytes, mocked_judge, reachable_profile
) -> None:
    """`sample_pdf_bytes` is built with fitz and has no AcroForm — 422 expected."""
    response = client.post(
        "/api/documents/process",
        files={"file": ("flat.pdf", sample_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert response.status_code == 422, response.text
    assert "AcroForm" in response.json()["detail"]


def test_process_rejects_unknown_profile(
    client, corpus_pdf_bytes, mocked_judge, reachable_profile
) -> None:
    response = client.post(
        "/api/documents/process",
        files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
        data={"profile": "bogus-profile"},
    )
    assert response.status_code == 422, response.text
    assert "unknown profile" in response.json()["detail"]


def test_process_rejects_unreachable_profile(
    client, corpus_pdf_bytes, mocked_judge, monkeypatch
) -> None:
    """When the OpenAI key is missing, the profile pre-flight returns 422."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/api/documents/process",
        files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert response.status_code == 422, response.text
    assert "not reachable" in response.json()["detail"]


def test_process_rejects_non_pdf_bytes(
    client, not_a_pdf_bytes, mocked_judge, reachable_profile
) -> None:
    """Non-PDF bytes (e.g. plain text) hit pypdf's PdfReadError; we map it to 422."""
    response = client.post(
        "/api/documents/process",
        files={"file": ("notes.txt", not_a_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert response.status_code == 422, response.text
    assert "readable PDF" in response.json()["detail"]


def test_process_rejects_oversize(client, mocked_judge, reachable_profile) -> None:
    """Bodies above the 20 MB cap return 413; bytes don't need to be a real PDF."""
    big = b"%PDF-1.4\n" + b"A" * (21 * 1024 * 1024)
    response = client.post(
        "/api/documents/process",
        files={"file": ("big.pdf", big, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert response.status_code == 413, response.text
