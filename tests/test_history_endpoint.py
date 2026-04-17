"""Functional tests for GET /api/history and GET /api/history/{id}."""

from __future__ import annotations

import asyncio


def _seed(rows):
    """Insert the given rows directly via save_classification (bypassing the model)."""
    from src.api.database import save_classification

    async def _go():
        for row in rows:
            await save_classification(**row)

    asyncio.run(_go())


def test_history_pagination_and_filters(client):
    """Seed 5 rows across 2 labels and exercise pagination + label + search filters."""
    _seed(
        [
            {
                "filename": "permit_001.pdf",
                "label": "permit-3-8",
                "confidence": 0.91,
                "probabilities": {"permit-3-8": 0.91, "not-permit-3-8": 0.09},
                "text_preview": "permit text",
                "file_size": 1000,
            },
            {
                "filename": "permit_002.pdf",
                "label": "permit-3-8",
                "confidence": 0.87,
                "probabilities": {"permit-3-8": 0.87, "not-permit-3-8": 0.13},
                "text_preview": "permit text",
                "file_size": 1100,
            },
            {
                "filename": "other_001.pdf",
                "label": "not-permit-3-8",
                "confidence": 0.70,
                "probabilities": {"permit-3-8": 0.30, "not-permit-3-8": 0.70},
                "text_preview": "unrelated text",
                "file_size": 900,
            },
            {
                "filename": "other_002.pdf",
                "label": "not-permit-3-8",
                "confidence": 0.65,
                "probabilities": {"permit-3-8": 0.35, "not-permit-3-8": 0.65},
                "text_preview": "unrelated text",
                "file_size": 950,
            },
            {
                "filename": "permit_003.pdf",
                "label": "permit-3-8",
                "confidence": 0.99,
                "probabilities": {"permit-3-8": 0.99, "not-permit-3-8": 0.01},
                "text_preview": "permit text",
                "file_size": 1200,
            },
        ]
    )

    # pagination
    page1 = client.get("/api/history?page=1&limit=2").json()
    assert page1["total"] == 5
    assert page1["page"] == 1
    assert len(page1["items"]) == 2

    # label filter
    permits = client.get("/api/history?label=permit-3-8").json()
    assert permits["total"] == 3
    assert {item["label"] for item in permits["items"]} == {"permit-3-8"}

    # search filter
    searched = client.get("/api/history?search=other").json()
    assert searched["total"] == 2
    assert all("other" in item["filename"] for item in searched["items"])

    # 404 on missing entry
    assert client.get("/api/history/99999").status_code == 404

    # invalid params rejected
    assert client.get("/api/history?page=0").status_code == 422
    assert client.get("/api/history?limit=101").status_code == 422
