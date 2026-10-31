"""Fixed, server-owned role and permission catalog.

Roles and grants are defined in code, not accepted from a request or read from a
client-controlled source. Database ``role_permissions`` rows mirror this table
for documentation and future defense in depth; this module remains the API
authority. Unknown roles and unknown permissions deny by default.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from enum import StrEnum
from typing import Final

POLICY_VERSION: Final = "rbac-v1"


class Role(StrEnum):
    """Account roles supported by the product."""

    USER = "user"
    STAFF = "staff"
    ADMIN = "admin"


class Permission(StrEnum):
    """Every explicit permission the server can grant."""

    LAW_READ = "law.read"
    LAW_DRAFT = "law.draft"
    LAW_PUBLISH = "law.publish"
    STAFF_MANAGE = "staff.manage"
    WORKFLOW_MANAGE = "workflow.manage"
    ANALYTICS_READ = "analytics.read"


ROLE_PERMISSIONS: Final[Mapping[Role, frozenset[Permission]]] = {
    Role.USER: frozenset({Permission.LAW_READ}),
    Role.STAFF: frozenset({Permission.LAW_READ, Permission.LAW_DRAFT}),
    Role.ADMIN: frozenset(Permission),
}


def permissions_for_role(role: Role | str | None) -> frozenset[Permission]:
    """Return the fixed grants for a role; unknown or missing roles get none."""
    if role is None:
        return frozenset()
    try:
        resolved = role if isinstance(role, Role) else Role(str(role).strip().lower())
    except ValueError:
        return frozenset()
    return ROLE_PERMISSIONS[resolved]


def has_permission(permissions: Iterable[str], permission: Permission | str) -> bool:
    """Return whether the collected permission names include ``permission``.

    Values are compared by name, so a database-loaded permission set can be
    passed later without changing this check. Unknown values simply do not match.
    """
    try:
        required = (
            permission if isinstance(permission, Permission) else Permission(permission)
        )
    except ValueError:
        return False
    return any(str(granted) == required.value for granted in permissions)


def permission_snapshot(permissions: Iterable[Permission]) -> list[Permission]:
    """Return a stable, presentation-safe capability list."""
    return sorted(permissions, key=lambda permission: permission.value)
