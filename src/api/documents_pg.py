"""Postgres repository for the ``documents`` table (per-user keyed).

Separate from the SQLite-backed ``documents.py`` so the legacy classifier
endpoint can keep its existing behavior while the pipeline endpoint runs
against Supabase Postgres. Per-user dedupe is enforced by the
``documents_uploaded_by_sha256_uniq`` index — see migration
``20260509071343_documents_user_sha_unique.sql``.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from src.api.postgres import get_pool


async def upsert_document(
    *,
    uploaded_by: UUID,
    sha256: str,
    filename: str,
    size_bytes: int,
    gcs_path: str,
) -> UUID:
    """Insert a documents row for this user, or return the existing id on dedupe.

    Behavior: per-user dedupe — a re-upload of the same PDF by the same user
    returns the existing ``document_id``. A different user uploading the same
    PDF gets their own row (so RLS / per-user history stays clean).
    The ``DO UPDATE SET sha256 = EXCLUDED.sha256`` is a no-op write that exists
    only to make ``RETURNING`` fire on the conflict path.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO documents
                (sha256, gcs_path, filename, size_bytes, uploaded_by)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (uploaded_by, sha256)
            DO UPDATE SET sha256 = EXCLUDED.sha256
            RETURNING id
            """,
            sha256,
            gcs_path,
            filename,
            size_bytes,
            uploaded_by,
        )
        return row["id"]


async def get_document_for_user(
    *, uploaded_by: UUID, sha256: str
) -> dict[str, Any] | None:
    """Return the user's documents row for this sha256, or None if absent."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, sha256, gcs_path, filename, size_bytes, uploaded_at, uploaded_by
            FROM documents
            WHERE uploaded_by = $1 AND sha256 = $2
            """,
            uploaded_by,
            sha256,
        )
        return dict(row) if row else None
