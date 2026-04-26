"""Tests for GET /api/classifications/{id} and /api/classifications/{id}/pdf."""

from __future__ import annotations

import asyncio


def test_get_classification_metadata(client, sample_pdf_bytes):
    r = client.post(
        "/api/predict", files={"file": ("a.pdf", sample_pdf_bytes, "application/pdf")}
    )
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    r2 = client.get(f"/api/classifications/{cid}")
    assert r2.status_code == 200
    body = r2.json()
    assert body["id"] == cid
    assert body["pdf_sha256"]


def test_get_classification_pdf_returns_bytes(client, sample_pdf_bytes):
    r = client.post(
        "/api/predict", files={"file": ("a.pdf", sample_pdf_bytes, "application/pdf")}
    )
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    r2 = client.get(f"/api/classifications/{cid}/pdf")
    assert r2.status_code == 200
    assert r2.headers["content-type"] == "application/pdf"
    assert r2.content == sample_pdf_bytes


def test_get_classification_pdf_410_when_legacy_null_sha(client):
    from src.api.database import save_classification

    cid = asyncio.run(
        save_classification(
            filename="legacy.pdf",
            label="permit-3-8",
            confidence=0.9,
            probabilities={"permit-3-8": 0.9},
            pdf_sha256=None,
        )
    )
    r = client.get(f"/api/classifications/{cid}/pdf")
    assert r.status_code == 410


def test_get_classification_404(client):
    r = client.get("/api/classifications/99999")
    assert r.status_code == 404
    r2 = client.get("/api/classifications/99999/pdf")
    assert r2.status_code == 404
