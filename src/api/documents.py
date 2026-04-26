"""Repository for the documents table (PDF metadata keyed by SHA-256)."""

from __future__ import annotations

from src.api.database import get_db


async def upsert_document(sha256: str, size_bytes: int) -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR IGNORE INTO documents (sha256, size_bytes) VALUES (?, ?)",
            (sha256, size_bytes),
        )
        await db.commit()
    finally:
        await db.close()


async def get_document(sha256: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM documents WHERE sha256 = ?", (sha256,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()
