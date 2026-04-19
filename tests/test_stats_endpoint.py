"""Functional tests for GET /api/stats."""

from __future__ import annotations

import asyncio


def _seed(rows):
    """Insert rows directly via save_classification (bypassing the model)."""
    from src.api.database import save_classification

    async def _go():
        for row in rows:
            await save_classification(**row)

    asyncio.run(_go())


def test_stats_empty(client):
    """With no rows seeded, stats should return zeros and an empty label_counts."""
    response = client.get("/api/stats")
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["total"] == 0
    assert body["label_counts"] == {}
    assert body["recent_count_7d"] == 0


def test_stats_counts_total_and_labels(client):
    """Totals and per-label counts should reflect the rows in the DB."""
    _seed(
        [
            {
                "filename": "a.pdf",
                "label": "permit-3-8",
                "confidence": 0.9,
                "probabilities": {"permit-3-8": 0.9, "not-permit-3-8": 0.1},
                "text_preview": "x",
                "file_size": 100,
            },
            {
                "filename": "b.pdf",
                "label": "permit-3-8",
                "confidence": 0.8,
                "probabilities": {"permit-3-8": 0.8, "not-permit-3-8": 0.2},
                "text_preview": "x",
                "file_size": 100,
            },
            {
                "filename": "c.pdf",
                "label": "not-permit-3-8",
                "confidence": 0.7,
                "probabilities": {"permit-3-8": 0.3, "not-permit-3-8": 0.7},
                "text_preview": "x",
                "file_size": 100,
            },
        ]
    )

    body = client.get("/api/stats").json()
    assert body["total"] == 3
    assert body["label_counts"] == {"permit-3-8": 2, "not-permit-3-8": 1}
    # Rows seeded in this test default to CURRENT_TIMESTAMP, so all are "recent".
    assert body["recent_count_7d"] == 3
