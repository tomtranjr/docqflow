"""Repository for the pipeline_runs table (Stages 4-6 output keyed by sha256)."""

from __future__ import annotations

import json
from typing import Any

from src.api.database import get_db
from src.pipeline.schemas import PipelineResult


async def upsert_pipeline_run(sha256: str, result: PipelineResult) -> None:
    """Insert or replace the latest pipeline run for a document.

    The same PDF re-uploaded (or re-processed) overwrites the prior row — Stages
    4-5 are deterministic for a given PDF and Stage 6 results are intentionally
    snapshot-replaced rather than appended. Future per-run history lives in
    docqflow-2qr.2's Postgres pipeline_runs table.
    """
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR REPLACE INTO pipeline_runs "
            "(sha256, document_id, llm_profile, verdict, extracted_fields_json, "
            " issues_json, latency_ms) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                sha256,
                str(result.document_id),
                result.llm_profile,
                result.verdict,
                json.dumps(result.extracted_fields),
                json.dumps([i.model_dump() for i in result.issues]),
                result.latency_ms,
            ),
        )
        await db.commit()
    finally:
        await db.close()


async def get_pipeline_run(sha256: str) -> dict[str, Any] | None:
    """Return the latest pipeline run for a document, or None if no run exists.

    Returns a dict shaped like ``PipelineResult.model_dump()`` so callers can
    pass it straight to ``PipelineResult.model_validate(...)``.
    """
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT sha256, document_id, llm_profile, verdict, "
            "extracted_fields_json, issues_json, latency_ms "
            "FROM pipeline_runs WHERE sha256 = ?",
            (sha256,),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return {
            "sha256": row["sha256"],
            "document_id": row["document_id"],
            "llm_profile": row["llm_profile"],
            "verdict": row["verdict"],
            "extracted_fields": json.loads(row["extracted_fields_json"]),
            "issues": json.loads(row["issues_json"]),
            "latency_ms": row["latency_ms"],
        }
    finally:
        await db.close()
