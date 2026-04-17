import json
import os

import aiosqlite

DB_PATH = os.getenv("DOCQFLOW_DB_PATH", "data/docqflow.db")


async def get_db() -> aiosqlite.Connection:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    return db


async def init_db() -> None:
    db = await get_db()
    try:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS classifications (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                filename      TEXT NOT NULL,
                uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                label         TEXT NOT NULL,
                confidence    REAL NOT NULL,
                probabilities TEXT NOT NULL,
                text_preview  TEXT,
                file_size     INTEGER
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_classifications_uploaded_at "
            "ON classifications(uploaded_at)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_classifications_label "
            "ON classifications(label)"
        )
        await db.commit()
    finally:
        await db.close()


async def save_classification(
    filename: str,
    label: str,
    confidence: float,
    probabilities: dict,
    text_preview: str | None = None,
    file_size: int | None = None,
) -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO classifications "
            "(filename, label, confidence, probabilities, text_preview, file_size) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                filename,
                label,
                confidence,
                json.dumps(probabilities),
                text_preview,
                file_size,
            ),
        )
        await db.commit()
    finally:
        await db.close()


async def get_history(
    page: int = 1,
    limit: int = 25,
    label: str | None = None,
    search: str | None = None,
) -> dict:
    if page < 1:
        raise ValueError("page must be >= 1")
    if limit < 1:
        raise ValueError("limit must be >= 1")

    db = await get_db()
    try:
        where_clauses: list[str] = []
        params: list[str | int] = []

        if label:
            where_clauses.append("label = ?")
            params.append(label)
        if search:
            escaped_search = (
                search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            )
            where_clauses.append("filename LIKE ? ESCAPE '\\'")
            params.append(f"%{escaped_search}%")

        where = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        cursor = await db.execute(
            f"SELECT COUNT(*) FROM classifications {where}", params
        )
        total = (await cursor.fetchone())[0]

        offset = (page - 1) * limit
        cursor = await db.execute(
            f"SELECT * FROM classifications {where} ORDER BY uploaded_at DESC LIMIT ? OFFSET ?",
            [*params, limit, offset],
        )
        items = [dict(row) for row in await cursor.fetchall()]

        return {"items": items, "total": total, "page": page}
    finally:
        await db.close()


async def get_classification(entry_id: int) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM classifications WHERE id = ?", (entry_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def get_stats() -> dict:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) FROM classifications")
        total = (await cursor.fetchone())[0]

        cursor = await db.execute(
            "SELECT label, COUNT(*) as count FROM classifications GROUP BY label"
        )
        label_counts = {row[0]: row[1] for row in await cursor.fetchall()}

        cursor = await db.execute(
            "SELECT COUNT(*) FROM classifications "
            "WHERE uploaded_at >= datetime('now', '-7 days')"
        )
        recent_count_7d = (await cursor.fetchone())[0]

        return {
            "total": total,
            "label_counts": label_counts,
            "recent_count_7d": recent_count_7d,
        }
    finally:
        await db.close()
