"""Account records and PostgreSQL access for ``public.app_users``.

The server is the only writer of roles and account status. Repository methods
return records; authorization decisions happen in the service layer so a route
cannot accept a role from a request body or token claim.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol
from uuid import UUID

from app.core.db import Database


@dataclass(frozen=True, slots=True)
class AccountRecord:
    """Trusted account state loaded from the server database."""

    id: UUID
    auth_user_id: UUID | None
    email: str
    role: str
    status: str


class AccountRepository(Protocol):
    """Persistence boundary for accounts used by the identity slice."""

    async def get_by_id(self, account_id: UUID) -> AccountRecord | None:
        """Load an account by its ``app_users`` primary key."""
        ...

    async def get_by_auth_user_id(self, auth_user_id: UUID) -> AccountRecord | None:
        """Load the account linked to a Supabase Auth user ID."""
        ...


def _account_from_row(row: Any) -> AccountRecord:
    return AccountRecord(
        id=row["id"],
        auth_user_id=row["auth_user_id"],
        email=row["email"],
        role=row["role"],
        status=row["status"],
    )


class SqlAccountRepository:
    """PostgreSQL implementation backed by the shared asyncpg pool."""

    def __init__(self, database: Database) -> None:
        self._database = database

    async def get_by_id(self, account_id: UUID) -> AccountRecord | None:
        row = await self._database.fetchrow(
            """
            select id, auth_user_id, email, role, status
            from public.app_users
            where id = $1
            """,
            account_id,
        )
        return _account_from_row(row) if row is not None else None

    async def get_by_auth_user_id(self, auth_user_id: UUID) -> AccountRecord | None:
        row = await self._database.fetchrow(
            """
            select id, auth_user_id, email, role, status
            from public.app_users
            where auth_user_id = $1
            """,
            auth_user_id,
        )
        return _account_from_row(row) if row is not None else None
