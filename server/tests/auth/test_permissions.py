"""Unit tests for the fixed permission catalog and deny-by-default behavior."""

from __future__ import annotations

from app.authorization.permissions import (
    Permission,
    Role,
    has_permission,
    permission_snapshot,
    permissions_for_role,
)


def test_catalog_is_the_fixed_product_set() -> None:
    assert {permission.value for permission in Permission} == {
        "law.read",
        "law.draft",
        "law.publish",
        "staff.manage",
        "workflow.manage",
        "analytics.read",
    }


def test_user_grants_are_read_only() -> None:
    assert permissions_for_role(Role.USER) == frozenset({Permission.LAW_READ})
    assert permissions_for_role("user") == frozenset({Permission.LAW_READ})


def test_staff_can_draft_but_not_publish_or_manage_staff() -> None:
    grants = permissions_for_role(Role.STAFF)

    assert grants == frozenset({Permission.LAW_READ, Permission.LAW_DRAFT})
    assert not has_permission(grants, Permission.LAW_PUBLISH)
    assert not has_permission(grants, Permission.STAFF_MANAGE)
    assert not has_permission(grants, Permission.WORKFLOW_MANAGE)
    assert not has_permission(grants, Permission.ANALYTICS_READ)


def test_admin_has_every_catalogued_permission() -> None:
    grants = permissions_for_role(Role.ADMIN)

    assert grants == frozenset(Permission)
    for permission in Permission:
        assert has_permission(grants, permission)


def test_unknown_or_missing_roles_deny_by_default() -> None:
    assert permissions_for_role(None) == frozenset()
    assert permissions_for_role("owner") == frozenset()
    assert permissions_for_role("") == frozenset()


def test_role_names_are_normalized_before_lookup() -> None:
    assert permissions_for_role(" ADMIN ") == frozenset(Permission)


def test_unknown_permission_never_matches() -> None:
    grants = permissions_for_role(Role.ADMIN)

    assert not has_permission(grants, "law.unknown")
    assert not has_permission(grants, "")


def test_snapshot_is_sorted_and_stable() -> None:
    assert [item.value for item in permission_snapshot(permissions_for_role(Role.ADMIN))] == [
        "analytics.read",
        "law.draft",
        "law.publish",
        "law.read",
        "staff.manage",
        "workflow.manage",
    ]
