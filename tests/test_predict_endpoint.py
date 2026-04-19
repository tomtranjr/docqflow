"""Functional tests for POST /api/predict."""

from __future__ import annotations

import pytest


def test_predict_happy_path(client, sample_pdf_bytes):
    """A valid PDF returns 200 with a label in the class set and probabilities."""
    response = client.post(
        "/api/predict",
        files={"file": ("permit.pdf", sample_pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200, response.text

    body = response.json()
    assert isinstance(body["label"], str)
    assert isinstance(body["probabilities"], dict)
    assert body["label"] in body["probabilities"]
    assert all(isinstance(v, float) for v in body["probabilities"].values())

    history = client.get("/api/history").json()
    assert history["total"] == 1
    assert history["items"][0]["filename"] == "permit.pdf"
    assert history["items"][0]["label"] == body["label"]


@pytest.mark.parametrize(
    "filename, content_type, body_fixture, case_id",
    [
        ("notes.txt", "text/plain", "not_a_pdf_bytes", "non_pdf_upload"),
        ("blank.pdf", "application/pdf", "blank_pdf_bytes", "blank_pdf"),
    ],
)
def test_predict_rejects_invalid_uploads(
    client, request, filename, content_type, body_fixture, case_id
):
    """Non-PDFs and blank PDFs should both be rejected with a 4xx, not 500.

    This test hardens the server-side gate alongside the client-side DropZone check.
    If the .txt case surfaces a 500, the fix is small: catch fitz's error in
    predict_pdf and raise HTTPException(422) instead of letting it bubble.
    """
    body_bytes = request.getfixturevalue(body_fixture)
    response = client.post(
        "/api/predict",
        files={"file": (filename, body_bytes, content_type)},
    )
    assert 400 <= response.status_code < 500, (
        f"case={case_id} expected 4xx, got {response.status_code}: {response.text}"
    )
