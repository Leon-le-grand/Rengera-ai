"""Audit records for privileged and denied authorization actions.

Audit rows contain actor and target identifiers, the outcome and request ID.
They never contain passwords, access tokens, session tokens, CSRF values or
request bodies. The API uses the service-role connection; RLS is enabled with no
anon/authenticated policies on the backing table.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Protocol
from uuid import UUID

from app.core.db import Database
from app.core.request_context import current_or_new_request_id

logger = logging.getLogger("app.audit")


class AuditOutcome(StrEnum):
    """Recorded result of a privileged action or an authorization attempt."""

    ALLOWED = "allowed"
    DENIED = "denied"
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class AuditEntry:
    """One immutable audit record ready for persistence."""

    actor_account_id: UUID | None
    action: str
    outcome: AuditOutcome
    request_id: str = field(default_factory=current_or_new_request_id)
    target_type: str | None = None
    target_id: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)


class AdminAuditRepository(Protocol):
    """Persistence boundary for admin audit records."""

    async def record(self, entry: AuditEntry) -> None:
        """Append one audit entry."""
        ...


class SqlAdminAuditRepository:
    """PostgreSQL audit repository used by the API process."""

    def __init__(self, database: Database) -> None:
        self._database = database

    async def record(self, entry: AuditEntry) -> None:
        metadata = json.dumps(dict(entry.metadata), separators=(",", ":"), default=str)
        await self._database.execute(
            """
            insert into public.admin_audit_log (
                actor_account_id,
                action,
                target_type,
                target_id,
                outcome,
                request_id,
                metadata
            )
            values ($1, $2, $3, $4, $5, $6, $7::jsonb)
            """,
            entry.actor_account_id,
            entry.action,
            entry.target_type,
            entry.target_id,
            entry.outcome.value,
            entry.request_id,
            metadata,
        )


async def record_audit_safely(
    repository: AdminAuditRepository,
    entry: AuditEntry,
) -> bool:
    """Attempt an audit write without masking an already-decided denial.

    Returns ``True`` on success. A failure is logged without audit metadata or
    credentials so the caller can still return its safe 403/401 response.
    """
    try:
        await repository.record(entry)
    except Exception:
        logger.exception("audit_write_failed", extra={"event": "audit_write_failed"})
        return False
    return True
