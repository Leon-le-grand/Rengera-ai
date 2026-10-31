"""Opaque browser-session persistence.

Only SHA-256 hashes of session and CSRF tokens are stored. A database reader
cannot reconstruct a usable session token from ``token_hash``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from app.core.db import Database


@dataclass(frozen=True, slots=True)
class SessionRecord:
    """Server-side session state; never contains the raw bearer value."""

    id: UUID
    account_id: UUID
    token_hash: str
    csrf_token_hash: str
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None
    last_seen_at: datetime | None = None


class SessionRepository(Protocol):
    """Persistence boundary for server sessions."""

    async def create(self, session: SessionRecord) -> None:
        """Persist a newly created session."""
        ...

    async def get_by_token_hash(self, token_hash: str) -> SessionRecord | None:
        """Find a session by the hash of the presented opaque token."""
        ...

    async def revoke(self, session_id: UUID, revoked_at: datetime) -> bool:
        """Mark an active session revoked; return whether a row changed."""
        ...

    async def touch_last_seen(self, session_id: UUID, seen_at: datetime) -> None:
        """Best-effort update of activity metadata."""
        ...


def _session_from_row(row: Any) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        account_id=row["account_id"],
        token_hash=row["token_hash"],
        csrf_token_hash=row["csrf_token_hash"],
        created_at=row["created_at"],
        expires_at=row["expires_at"],
        revoked_at=row["revoked_at"],
        last_seen_at=row["last_seen_at"],
    )


class SqlSessionRepository:
    """PostgreSQL implementation backed by the shared asyncpg pool."""

    def __init__(self, database: Database) -> None:
        self._database = database

    async def create(self, session: SessionRecord) -> None:
        await self._database.execute(
            """
            insert into public.server_sessions (
                id,
                account_id,
                token_hash,
                csrf_token_hash,
                created_at,
                expires_at,
                revoked_at,
                last_seen_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            session.id,
            session.account_id,
            session.token_hash,
            session.csrf_token_hash,
            session.created_at,
            session.expires_at,
            session.revoked_at,
            session.last_seen_at,
        )

    async def get_by_token_hash(self, token_hash: str) -> SessionRecord | None:
        row = await self._database.fetchrow(
            """
            select
                id,
                account_id,
                token_hash,
                csrf_token_hash,
                created_at,
                expires_at,
                revoked_at,
                last_seen_at
            from public.server_sessions
            where token_hash = $1
            """,
            token_hash,
        )
        return _session_from_row(row) if row is not None else None

    async def revoke(self, session_id: UUID, revoked_at: datetime) -> bool:
        result = await self._database.execute(
            """
            update public.server_sessions
            set revoked_at = $2
            where id = $1 and revoked_at is null
            """,
            session_id,
            revoked_at,
        )
        return result.endswith(" 1")

    async def touch_last_seen(self, session_id: UUID, seen_at: datetime) -> None:
        await self._database.execute(
            """
            update public.server_sessions
            set last_seen_at = $2
            where id = $1 and revoked_at is null
            """,
            session_id,
            seen_at,
        )
