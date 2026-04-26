"""Unit tests for the database layer: round-trip + JSON probability serialization."""

from __future__ import annotations

import asyncio
import json

import pytest


def test_save_and_retrieve_round_trip(test_db_path):
    """save_classification -> get_classification preserves every field, including probabilities."""
    from src.api.database import (
        get_classification,
        get_history,
        init_db,
        save_classification,
    )

    payload = {
        "filename": "sample.pdf",
        "label": "permit-3-8",
        "confidence": 0.92,
        "probabilities": {"permit-3-8": 0.92, "not-permit-3-8": 0.08},
        "text_preview": "permit application form 3-8",
        "file_size": 2048,
    }

    async def _go():
        await init_db()
        await save_classification(**payload)
        # id is auto-increment; look up via history to find what we just wrote
        history = await get_history(page=1, limit=10)
        assert history["total"] == 1
        entry_id = history["items"][0]["id"]
        return await get_classification(entry_id)

    record = asyncio.run(_go())

    assert record is not None
    assert record["filename"] == payload["filename"]
    assert record["label"] == payload["label"]
    assert record["confidence"] == payload["confidence"]
    assert record["text_preview"] == payload["text_preview"]
    assert record["file_size"] == payload["file_size"]

    # probabilities is stored as JSON; the DB layer returns the raw string and the
    # /api/history route parses it. This test guards the storage-layer contract.
    assert isinstance(record["probabilities"], str)
    assert json.loads(record["probabilities"]) == payload["probabilities"]


@pytest.mark.asyncio
async def test_save_classification_returns_id(test_db_path):
    from src.api.database import init_db, save_classification

    await init_db()
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
async def test_save_classification_persists_pdf_sha256(test_db_path):
    from src.api.database import get_classification, init_db, save_classification

    await init_db()
    new_id = await save_classification(
        filename="test.pdf",
        label="permit-3-8",
        confidence=0.95,
        probabilities={"permit-3-8": 0.95},
        pdf_sha256="abc123",
    )
    row = await get_classification(new_id)
    assert row["pdf_sha256"] == "abc123"
