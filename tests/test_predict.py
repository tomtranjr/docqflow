"""Tests for predict-endpoint behavior added in PR 1: id + pdf_sha256 + PDF persistence."""

from __future__ import annotations

from pathlib import Path


def test_predict_returns_id_and_pdf_sha256(client, sample_pdf_bytes):
    response = client.post(
        "/api/predict",
        files={"file": ("permit.pdf", sample_pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "id" in body and isinstance(body["id"], int) and body["id"] > 0
    assert "label" in body
    assert "probabilities" in body
    assert "pdf_sha256" in body and len(body["pdf_sha256"]) == 64


def test_predict_persists_pdf_to_filesystem(client, sample_pdf_bytes, tmp_path):
    response = client.post(
        "/api/predict",
        files={"file": ("permit.pdf", sample_pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200, response.text
    sha = response.json()["pdf_sha256"]
    # _isolate_cwd autouse fixture chdirs to tmp_path; pdf_dir defaults to data/pdfs
    saved = Path(tmp_path) / "data" / "pdfs" / f"{sha}.pdf"
    assert saved.exists()
    assert saved.read_bytes() == sample_pdf_bytes
