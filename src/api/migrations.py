"""Versioned schema migrations for the DocQFlow database."""

from __future__ import annotations

import aiosqlite

# Each entry: (version, [SQL statements]). Versions monotonic, applied in order.
MIGRATIONS: list[tuple[int, list[str]]] = [
    (
        1,
        [
            """
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
            """,
            "CREATE INDEX IF NOT EXISTS idx_classifications_uploaded_at ON classifications(uploaded_at)",
            "CREATE INDEX IF NOT EXISTS idx_classifications_label ON classifications(label)",
        ],
    ),
    (
        2,
        [
            """
            CREATE TABLE IF NOT EXISTS documents (
                sha256     TEXT PRIMARY KEY,
                size_bytes INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            # ALTER TABLE ADD COLUMN is not idempotent on older SQLite; runner guards.
            "ALTER TABLE classifications ADD COLUMN pdf_sha256 TEXT",
            "CREATE INDEX IF NOT EXISTS idx_classifications_sha256 ON classifications(pdf_sha256)",
        ],
    ),
]


async def apply_migrations(db: aiosqlite.Connection) -> None:
    await db.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (v INTEGER PRIMARY KEY)"
    )
    cur = await db.execute("SELECT COALESCE(MAX(v), 0) FROM schema_version")
    current = (await cur.fetchone())[0]

    for version, statements in MIGRATIONS:
        if version <= current:
            continue
        for stmt in statements:
            try:
                await db.execute(stmt)
            except aiosqlite.OperationalError as exc:
                # idempotency for ALTER TABLE ADD COLUMN
                if "duplicate column name" not in str(exc):
                    raise
        await db.execute("INSERT INTO schema_version (v) VALUES (?)", (version,))
    await db.commit()
