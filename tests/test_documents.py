"""Tests for the documents repository."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_upsert_document_inserts_new(test_db_path):
    from src.api.database import init_db
    from src.api.documents import get_document, upsert_document

    await init_db()
    await upsert_document("abc", 1024)
    row = await get_document("abc")
    assert row["sha256"] == "abc"
    assert row["size_bytes"] == 1024


@pytest.mark.asyncio
async def test_upsert_document_is_idempotent(test_db_path):
    from src.api.database import init_db
    from src.api.documents import get_document, upsert_document

    await init_db()
    await upsert_document("abc", 1024)
    await upsert_document("abc", 1024)  # no error, no duplicate
    row = await get_document("abc")
    assert row is not None


@pytest.mark.asyncio
async def test_get_document_returns_none_for_missing(test_db_path):
    from src.api.database import init_db
    from src.api.documents import get_document

    await init_db()
    row = await get_document("nope")
    assert row is None
