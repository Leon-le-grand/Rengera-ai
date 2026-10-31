"""Role/action matrix and audited privileged-action tests."""

from __future__ import annotations

from uuid import uuid4

import pytest
from auth_helpers import expected_capabilities
from fastapi import HTTPException

from app.auth.principal import AccountStatus, Principal
from app.authorization.actions import execute_privileged_action
from app.authorization.audit import AuditEntry, AuditOutcome
from app.authorization.permissions import Permission, Role, permissions_for_role


def test_staff_can_draft_but_cannot_publish_or_manage_staff(harness) -> None:
    account = harness.accounts.add(role=Role.STAFF)
    harness.login(account)

    draft = harness.client.post(
        "/v1/test/permissions/draft",
        headers=harness.csrf_header(),
    )
    publish = harness.client.post(
        "/v1/test/permissions/publish",
        headers=harness.csrf_header(),
    )
    manage_staff = harness.client.post(
        "/v1/test/permissions/staff",
        headers=harness.csrf_header(),
    )

    assert draft.status_code == 200
    assert publish.status_code == 403
    assert manage_staff.status_code == 403


def test_admin_can_draft_publish_and_manage_staff(harness) -> None:
    account = harness.accounts.add(role=Role.ADMIN)
    harness.login(account)

    for path in (
        "/v1/test/permissions/draft",
        "/v1/test/permissions/publish",
        "/v1/test/permissions/staff",
    ):
        response = harness.client.post(path, headers=harness.csrf_header())
        assert response.status_code == 200, path


def test_user_is_denied_staff_permissions(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    harness.login(account)

    for path in (
        "/v1/test/permissions/draft",
        "/v1/test/permissions/publish",
        "/v1/test/permissions/staff",
    ):
        response = harness.client.post(path, headers=harness.csrf_header())
        assert response.status_code == 403, path
        assert response.json()["error"]["code"] == "forbidden"


def test_anonymous_permission_check_returns_401(harness) -> None:
    response = harness.client.post("/v1/test/permissions/draft")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_me_capability_snapshot_matches_each_role(harness) -> None:
    for role in (Role.USER, Role.STAFF, Role.ADMIN):
        account = harness.accounts.add(role=role)
        harness.login(account)

        response = harness.client.get("/v1/me")

        assert response.status_code == 200
        assert response.json()["capabilities"] == expected_capabilities(role)


def test_denied_privileged_action_is_audited(harness) -> None:
    account = harness.accounts.add(role=Role.STAFF)
    harness.login(account)

    response = harness.client.post(
        "/v1/test/permissions/publish",
        headers=harness.csrf_header(),
    )

    assert response.status_code == 403
    assert len(harness.audit.entries) == 1
    entry = harness.audit.entries[0]
    assert entry.actor_account_id == account.id
    assert entry.action == "authorization.denied"
    assert entry.target_type == "permission"
    assert entry.target_id == Permission.LAW_PUBLISH.value
    assert entry.outcome is AuditOutcome.DENIED
    assert entry.request_id == response.headers["X-Request-ID"]


def _principal(role: Role) -> Principal:
    return Principal(
        account_id=uuid4(),
        auth_user_id=uuid4(),
        email=f"{role.value}@example.test",
        role=role,
        status=AccountStatus.ACTIVE,
        permissions=permissions_for_role(role),
        session_id=uuid4(),
    )


class _AuditSpy:
    def __init__(self) -> None:
        self.entries: list[AuditEntry] = []

    async def record(self, entry: AuditEntry) -> None:
        self.entries.append(entry)


async def test_audited_helper_records_allowed_action() -> None:
    audit = _AuditSpy()
    principal = _principal(Role.STAFF)

    async def operation() -> str:
        return "drafted"

    result = await execute_privileged_action(
        principal=principal,
        permission=Permission.LAW_DRAFT,
        audit_repository=audit,
        action="law.draft",
        target_type="law",
        target_id="law-1",
        operation=operation,
    )

    assert result == "drafted"
    assert len(audit.entries) == 1
    assert audit.entries[0].outcome is AuditOutcome.ALLOWED
    assert audit.entries[0].target_id == "law-1"


async def test_audited_helper_records_denied_action() -> None:
    audit = _AuditSpy()
    principal = _principal(Role.STAFF)

    async def operation() -> None:
        raise AssertionError("denied operation must not run")

    with pytest.raises(HTTPException) as raised:
        await execute_privileged_action(
            principal=principal,
            permission=Permission.LAW_PUBLISH,
            audit_repository=audit,
            action="law.publish",
            target_type="law",
            target_id="law-1",
            operation=operation,
        )

    assert raised.value.status_code == 403
    assert len(audit.entries) == 1
    assert audit.entries[0].outcome is AuditOutcome.DENIED
    assert audit.entries[0].target_id == "law-1"


async def test_audited_helper_records_failed_action() -> None:
    audit = _AuditSpy()
    principal = _principal(Role.ADMIN)

    async def operation() -> None:
        raise RuntimeError("provider failed")

    with pytest.raises(RuntimeError):
        await execute_privileged_action(
            principal=principal,
            permission=Permission.LAW_PUBLISH,
            audit_repository=audit,
            action="law.publish",
            operation=operation,
        )

    assert len(audit.entries) == 1
    assert audit.entries[0].outcome is AuditOutcome.FAILED


def test_audit_entry_defaults_include_request_identity() -> None:
    entry = AuditEntry(
        actor_account_id=None,
        action="test",
        outcome=AuditOutcome.DENIED,
    )

    assert entry.request_id
    assert entry.metadata == {}
    assert isinstance(entry.request_id, str)
