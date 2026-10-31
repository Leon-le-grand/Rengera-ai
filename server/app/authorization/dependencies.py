"""FastAPI authorization dependencies for protected routes."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.auth.dependencies import get_current_principal
from app.auth.principal import Principal
from app.authorization.audit import (
    AdminAuditRepository,
    AuditEntry,
    AuditOutcome,
    SqlAdminAuditRepository,
    record_audit_safely,
)
from app.authorization.permissions import Permission, has_permission
from app.core.db import Database, get_database
from app.core.request_context import current_or_new_request_id

logger = logging.getLogger("app.authorization")

FORBIDDEN_DETAIL = "You are not allowed to perform this action."


def get_audit_repository(
    database: Annotated[Database, Depends(get_database)],
) -> AdminAuditRepository:
    """Return the service-role audit repository."""
    return SqlAdminAuditRepository(database)


AuditRepositoryDep = Annotated[AdminAuditRepository, Depends(get_audit_repository)]


def _route_template(request: Request) -> str:
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    return path if isinstance(path, str) and path else request.url.path


def require_permission(
    permission: Permission,
) -> Callable[..., Awaitable[Principal]]:
    """Build a dependency that requires one explicit permission.

    ``get_current_principal`` rejects state-changing requests without a matching
    ``X-CSRF-Token`` before this check runs. Denials are audited with the active
    request ID; audit failure never turns a denial into an allow.
    """

    async def dependency(
        request: Request,
        principal: Annotated[Principal, Depends(get_current_principal)],
        audit_repository: AuditRepositoryDep,
    ) -> Principal:
        if not has_permission(principal.permissions, permission):
            logger.warning(
                "authorization_denied",
                extra={
                    "event": "authorization_denied",
                    "account_id": str(principal.account_id),
                    "permission": permission.value,
                    "method": request.method,
                    "path": _route_template(request),
                    "request_id": current_or_new_request_id(),
                },
            )
            await record_audit_safely(
                audit_repository,
                AuditEntry(
                    actor_account_id=principal.account_id,
                    action="authorization.denied",
                    target_type="permission",
                    target_id=permission.value,
                    outcome=AuditOutcome.DENIED,
                    request_id=current_or_new_request_id(),
                    metadata={
                        "method": request.method,
                        "path": _route_template(request),
                    },
                ),
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=FORBIDDEN_DETAIL,
            )
        return principal

    return dependency
