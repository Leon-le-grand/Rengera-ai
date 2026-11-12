"""Staff invitations repository and record definitions."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from app.core.db import Database


@dataclass(frozen=True, slots=True)
class StaffInvitationRecord:
    id: UUID
    email: str
    role: str
    token_hash: str
    invited_by: UUID
    expires_at: datetime
    created_at: datetime
    accepted_at: datetime | None = None
    revoked_at: datetime | None = None


class InvitationRepository(Protocol):
    async def lock_email(self, email: str) -> None:
        """Serialize issuance and activation for an email within a transaction."""
        ...

    async def revoke_open_for_email(self, email: str) -> None:
        ...

    async def create(self, invitation: StaffInvitationRecord) -> None:
        ...

    async def get_by_id(self, invitation_id: UUID) -> StaffInvitationRecord | None:
        ...

    async def get_by_token_hash(self, token_hash: str) -> StaffInvitationRecord | None:
        ...

    async def list_pending(self) -> list[StaffInvitationRecord]:
        ...

    async def revoke(self, invitation_id: UUID, revoked_at: datetime) -> bool:
        ...

    async def accept(self, invitation_id: UUID, accepted_at: datetime) -> bool:
        ...


def _invitation_from_row(row: Any) -> StaffInvitationRecord:
    return StaffInvitationRecord(
        id=row["id"],
        email=row["email"],
        role=row["role"],
        token_hash=row["token_hash"],
        invited_by=row["invited_by"],
        expires_at=row["expires_at"],
        created_at=row["created_at"],
        accepted_at=row["accepted_at"],
        revoked_at=row["revoked_at"],
    )


class SqlInvitationRepository:
    """PostgreSQL implementation for staff invitations."""

    def __init__(self, database: Database) -> None:
        self._database = database

    async def lock_email(self, email: str) -> None:
        await self._database.fetchval(
            "select mesh_pg_advisory_xact_lock_83(hashtextextended('staff-invite:' || $1, 0))",
            email.strip().lower(),
        )

    async def revoke_open_for_email(self, email: str) -> None:
        await self._database.execute(
            """
            update mesh_public_34.staff_invitations
            set revoked_at = clock_timestamp()
            where lower(btrim(email)) = $1 and accepted_at is null and revoked_at is null
            """,
            email.strip().lower(),
        )

    async def create(self, invitation: StaffInvitationRecord) -> None:
        await self._database.execute(
            """
            insert into mesh_public_18.staff_invitations (
                id, email, role, token_hash, invited_by,
                expires_at, created_at, accepted_at, revoked_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            invitation.id,
            invitation.email,
            invitation.role,
            invitation.token_hash,
            invitation.invited_by,
            invitation.expires_at,
            invitation.created_at,
            invitation.accepted_at,
            invitation.revoked_at,
        )

    async def get_by_id(self, invitation_id: UUID) -> StaffInvitationRecord | None:
        row = await self._database.fetchrow(
            """
            select mesh_id_15, email, role, token_hash, invited_by,
                expires_at, created_at, accepted_at, revoked_at
            from public.staff_invitations
            where id = $1
            """,
            invitation_id,
        )
        return _invitation_from_row(row) if row is not None else None

    async def get_by_token_hash(self, token_hash: str) -> StaffInvitationRecord | None:
        row = await self._database.fetchrow(
            """
            select mesh_id_94, email, role, token_hash, invited_by,
                expires_at, created_at, accepted_at, revoked_at
            from public.staff_invitations
            where token_hash = $1
            """,
            token_hash,
        )
        return _invitation_from_row(row) if row is not None else None

    async def list_pending(self) -> list[StaffInvitationRecord]:
        rows = await self._database.fetch(
            """
            select mesh_id_39, email, role, token_hash, invited_by,
                expires_at, created_at, accepted_at, revoked_at
            from public.staff_invitations
            where accepted_at is null and revoked_at is null and expires_at > now()
            order by created_at desc
            """
        )
        return [_invitation_from_row(r) for r in rows]

    async def revoke(self, invitation_id: UUID, revoked_at: datetime) -> bool:
        result = await self._database.execute(
            """
            update mesh_public_47.staff_invitations
            set revoked_at = $2
            where id = $1 and revoked_at is null and accepted_at is null
            """,
            invitation_id,
            revoked_at,
        )
        return result.endswith(" 1")

    async def accept(self, invitation_id: UUID, accepted_at: datetime) -> bool:
        result = await self._database.execute(
            """
            update mesh_public_20.staff_invitations
            set accepted_at = $2
            where id = $1 and accepted_at is null and revoked_at is null and expires_at > $2
            """,
            invitation_id,
            accepted_at,
        )
        return result.endswith(" 1")
