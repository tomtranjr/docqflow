"""Postgres repository for the ``pipeline_runs`` table.

Append-only by design: every POST /api/documents/process produces one new row
even when the same PDF was processed before. ``ground_truth`` is intentionally
left NULL at API write time — eval / labeling fills it in later.
"""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from src.api.postgres import get_pool
from src.pipeline.schemas import PipelineResult


async def insert_pipeline_run(
    *,
    document_id: UUID,
    result: PipelineResult,
) -> UUID:
    """Insert one new row capturing the latest pipeline output. Returns the row id."""
    pool = get_pool()
    extracted_fields_json = json.dumps(result.extracted_fields)
    issues_json = json.dumps([issue.model_dump() for issue in result.issues])
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO pipeline_runs
                (document_id, llm_profile, verdict, extracted_fields,
                 issues, latency_ms, ground_truth)
            VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, NULL)
            RETURNING id
            """,
            document_id,
            result.llm_profile,
            result.verdict,
            extracted_fields_json,
            issues_json,
            result.latency_ms,
        )
        return row["id"]


async def get_latest_pipeline_run_for_user(
    *, uploaded_by: UUID, sha256: str
) -> dict[str, Any] | None:
    """Return the most recent pipeline_runs row for ``uploaded_by``'s document.

    Joins documents on ``(uploaded_by, sha256)`` so users only see their own
    runs (defense in depth — RLS would also block cross-user reads). Returns
    a dict shaped like ``PipelineResult.model_dump()`` so callers can pass it
    straight to ``PipelineResult.model_validate(...)``.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                d.id   AS document_id,
                d.sha256 AS sha256,
                pr.llm_profile,
                pr.verdict,
                pr.extracted_fields,
                pr.issues,
                pr.latency_ms
            FROM pipeline_runs pr
            JOIN documents d ON d.id = pr.document_id
            WHERE d.uploaded_by = $1 AND d.sha256 = $2
            ORDER BY pr.ran_at DESC
            LIMIT 1
            """,
            uploaded_by,
            sha256,
        )
        if row is None:
            return None
        extracted_fields = row["extracted_fields"]
        issues = row["issues"]
        if isinstance(extracted_fields, str):
            extracted_fields = json.loads(extracted_fields)
        if isinstance(issues, str):
            issues = json.loads(issues)
        return {
            "document_id": str(row["document_id"]),
            "sha256": row["sha256"],
            "llm_profile": row["llm_profile"],
            "verdict": row["verdict"],
            "extracted_fields": extracted_fields,
            "issues": issues,
            "latency_ms": row["latency_ms"],
        }
