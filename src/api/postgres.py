"""Async Postgres pool for Supabase-backed pipeline persistence.

The pool is created once during app lifespan and reused per request. Tests do
not initialize a real pool — pipeline-route tests monkeypatch the
`documents_pg` / `pipeline_runs_pg` repository functions, so the pool is
never touched off the production code path.
"""

from __future__ import annotations

import asyncio

import asyncpg

from src.api.config import load_settings

_pool: asyncpg.Pool | None = None
_init_lock = asyncio.Lock()


async def init_pool() -> asyncpg.Pool:
    """Create the global asyncpg pool from DATABASE_URL. Idempotent + race-safe."""
    global _pool
    if _pool is not None:
        return _pool
    async with _init_lock:
        # Double-checked pattern: another coroutine may have raced us into init.
        if _pool is not None:
            return _pool
        settings = load_settings()
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL not configured")
        # `timeout` caps individual connection establishment; without it a
        # misconfigured DATABASE_URL can hang lifespan indefinitely.
        _pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=1,
            max_size=5,
            command_timeout=30,
            timeout=10,
        )
        return _pool


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError(
            "Postgres pool not initialized — did the FastAPI lifespan run?"
        )
    return _pool


async def close_pool() -> None:
    """Close the pool and clear the singleton even if close() raises."""
    global _pool
    if _pool is not None:
        try:
            await _pool.close()
        finally:
            _pool = None
