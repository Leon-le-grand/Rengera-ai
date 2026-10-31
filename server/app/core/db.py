"""Async PostgreSQL pool owned by the API process.

The pool is created once during application startup and shared by repositories.
The connection string is never logged. Tests replace repositories rather than
connecting to a hosted database.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any, Self

import asyncpg
from fastapi import Request
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.settings import Settings

logger = logging.getLogger("app.db")

COMMAND_TIMEOUT_SECONDS = 30.0


class DatabaseUnavailableError(RuntimeError):
    """Raised when a repository is asked to use an unconfigured pool."""


class Database:
    """Thin wrapper around an asyncpg pool with a small, explicit surface."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    @classmethod
    async def connect(cls, settings: Settings) -> Self:
        """Create the pool from validated settings; never log the DSN."""
        if settings.database_url is None:
            raise DatabaseUnavailableError("DATABASE_URL is not configured")
        dsn = settings.database_url.get_secret_value()
        pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=settings.db_pool_min_size,
            max_size=settings.db_pool_max_size,
            command_timeout=COMMAND_TIMEOUT_SECONDS,
            ssl=True if settings.database_ssl else None,
        )
        logger.info(
            "database_pool_created",
            extra={
                "event": "database_pool_created",
                "pool_min_size": settings.db_pool_min_size,
                "pool_max_size": settings.db_pool_max_size,
            },
        )
        return cls(pool)

    async def close(self) -> None:
        await self._pool.close()
        logger.info("database_pool_closed", extra={"event": "database_pool_closed"})

    @asynccontextmanager
    async def acquire(self) -> AsyncIterator[asyncpg.Connection]:
        async with self._pool.acquire() as connection:
            yield connection

    async def fetch(self, query: str, *args: Any) -> list[asyncpg.Record]:
        return await self._pool.fetch(query, *args)

    async def fetchrow(self, query: str, *args: Any) -> asyncpg.Record | None:
        return await self._pool.fetchrow(query, *args)

    async def fetchval(self, query: str, *args: Any) -> Any:
        return await self._pool.fetchval(query, *args)

    async def execute(self, query: str, *args: Any) -> str:
        return await self._pool.execute(query, *args)

    async def ping(self) -> bool:
        """Run a minimal query for readiness checks."""
        return await self._pool.fetchval("select 1") == 1


def get_database(request: Request) -> Database:
    """FastAPI dependency returning the process pool; fails closed with 503."""
    database: Database | None = getattr(request.app.state, "db", None)
    if database is None:
        raise StarletteHTTPException(
            status_code=503,
            detail="The legal database is not available.",
        )
    return database
