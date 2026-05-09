"""Tests for the schema_version migration runner."""

from __future__ import annotations

import os
import tempfile

import aiosqlite
import pytest

from src.api.migrations import MIGRATIONS, apply_migrations


@pytest.fixture
async def fresh_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    db = await aiosqlite.connect(path)
    db.row_factory = aiosqlite.Row
    yield db
    await db.close()
    os.unlink(path)


async def test_apply_migrations_creates_schema_version_table(fresh_db):
    await apply_migrations(fresh_db)
    cur = await fresh_db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    )
    row = await cur.fetchone()
    assert row is not None


async def test_apply_migrations_applies_v1_classifications(fresh_db):
    await apply_migrations(fresh_db)
    cur = await fresh_db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='classifications'"
    )
    assert (await cur.fetchone()) is not None


async def test_apply_migrations_applies_v2_documents_and_pdf_sha256(fresh_db):
    await apply_migrations(fresh_db)
    cur = await fresh_db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='documents'"
    )
    assert (await cur.fetchone()) is not None
    cur = await fresh_db.execute("PRAGMA table_info(classifications)")
    cols = [row[1] for row in await cur.fetchall()]
    assert "pdf_sha256" in cols


async def test_apply_migrations_is_idempotent(fresh_db):
    await apply_migrations(fresh_db)
    await apply_migrations(fresh_db)  # second run must not fail
    cur = await fresh_db.execute("SELECT MAX(v) FROM schema_version")
    max_v = (await cur.fetchone())[0]
    assert max_v == len(MIGRATIONS)


async def test_apply_migrations_advances_from_partial_state(fresh_db):
    # Simulate a v1-only DB (created before v2 existed).
    await fresh_db.execute("CREATE TABLE schema_version (v INTEGER PRIMARY KEY)")
    await fresh_db.execute(MIGRATIONS[0][1][0])  # v1 classifications table
    await fresh_db.execute("INSERT INTO schema_version (v) VALUES (1)")
    await fresh_db.commit()
    await apply_migrations(fresh_db)
    cur = await fresh_db.execute("SELECT MAX(v) FROM schema_version")
    assert (await cur.fetchone())[0] == len(MIGRATIONS)


async def test_apply_migrations_applies_v3_pipeline_runs(fresh_db):
    await apply_migrations(fresh_db)
    cur = await fresh_db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='pipeline_runs'"
    )
    assert (await cur.fetchone()) is not None
    cur = await fresh_db.execute("PRAGMA table_info(pipeline_runs)")
    cols = [row[1] for row in await cur.fetchall()]
    for expected in (
        "sha256",
        "document_id",
        "llm_profile",
        "verdict",
        "extracted_fields_json",
        "issues_json",
        "latency_ms",
        "created_at",
    ):
        assert expected in cols, f"pipeline_runs missing column {expected}"
