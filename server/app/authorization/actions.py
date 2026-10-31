"""Audited execution of privileged operations.

Routes must still enforce ``require_permission``; this helper adds the audit
trail and re-checks the permission at the point of effect. Any future mutation
that changes roles, publishes a law or manages staff should run through here so
both allowed and denied attempts are recorded.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Mapping
from typing import Any

from fastapi import HTTPException, status

from app.auth.principal import Principal
from app.authorization.audit import (
    AdminAuditRepository,
    AuditEntry,
    AuditOutcome,
    record_audit_safely,
)
from app.authorization.permissions import Permission, has_permission

FORBIDDEN_DETAIL = "You are not allowed to perform this action."


async def execute_privileged_action[T](
    *,
    principal: Principal,
    permission: Permission,
    audit_repository: AdminAuditRepository,
    action: str,
    operation: Callable[[], Awaitable[T]],
    target_type: str | None = None,
    target_id: str | None = None,
    metadata: Mapping[str, Any] | None = None,
    request_id: str | None = None,
) -> T:
    """Run ``operation`` only when ``principal`` holds ``permission``.

    A denied attempt is audited before the 403 is raised. Successful and failed
    operations are audited after they return or raise. For a mutation, the audit
    row should eventually share the mutation's transaction; this foundation
    helper records before the caller can return success when possible.
    """
    entry_defaults: dict[str, Any] = {
        "actor_account_id": principal.account_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "metadata": dict(metadata or {}),
    }
    if request_id is not None:
        entry_defaults["request_id"] = request_id

    if not has_permission(principal.permissions, permission):
        await record_audit_safely(
            audit_repository,
            AuditEntry(outcome=AuditOutcome.DENIED, **entry_defaults),
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN_DETAIL)

    try:
        result = await operation()
    except Exception:
        await record_audit_safely(
            audit_repository,
            AuditEntry(outcome=AuditOutcome.FAILED, **entry_defaults),
        )
        raise

    await audit_repository.record(
        AuditEntry(outcome=AuditOutcome.ALLOWED, **entry_defaults)
    )
    return result
