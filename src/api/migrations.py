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
    (
        3,
        [
            # Pipeline-run output keyed by document sha256. Re-running the same PDF
            # replaces the prior row (UPSERT in pipeline_runs.upsert_pipeline_run);
            # acceptable because Stages 4-5 are deterministic for a given PDF and
            # Stage 6 (LLM judges) overwrites into the latest snapshot per design.
            """
            CREATE TABLE IF NOT EXISTS pipeline_runs (
                sha256                TEXT PRIMARY KEY,
                document_id           TEXT NOT NULL,
                llm_profile           TEXT NOT NULL,
                verdict               TEXT NOT NULL,
                extracted_fields_json TEXT NOT NULL,
                issues_json           TEXT NOT NULL,
                latency_ms            INTEGER NOT NULL,
                created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sha256) REFERENCES documents(sha256)
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created_at ON pipeline_runs(created_at)",
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
                # ALTER TABLE ADD COLUMN is not idempotent on SQLite < 3.35;
                # silently ignore the "duplicate column name" case but rethrow
                # for any other ALTER failure or for non-ALTER statements.
                is_alter = stmt.lstrip().upper().startswith("ALTER TABLE")
                if is_alter and "duplicate column name" in str(exc):
                    continue
                raise
        await db.execute("INSERT INTO schema_version (v) VALUES (?)", (version,))
    await db.commit()
