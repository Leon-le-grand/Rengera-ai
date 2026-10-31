"""CSRF enforcement for logout and authenticated state-changing routes."""

from __future__ import annotations

from app.authorization.permissions import Role


def test_delete_session_requires_matching_csrf(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    harness.login(account)
    session_id = harness.sessions.only_session().id

    missing = harness.client.delete("/v1/session")
    assert missing.status_code == 403
    assert missing.json()["error"]["code"] == "forbidden"

    mismatch = harness.client.delete(
        "/v1/session",
        headers={"X-CSRF-Token": "not-the-session-csrf-token"},
    )
    assert mismatch.status_code == 403
    assert harness.sessions.records[session_id].revoked_at is None
    assert harness.client.get("/v1/me").status_code == 200

    valid = harness.client.delete("/v1/session", headers=harness.csrf_header())
    assert valid.status_code == 204
    assert harness.sessions.records[session_id].revoked_at is not None
    assert harness.client.get("/v1/me").status_code == 401

    clearing = valid.headers.get_list("set-cookie")
    assert any(
        header.startswith(f"{harness.settings.session_cookie_name}=") for header in clearing
    )
    assert any(
        header.startswith(f"{harness.settings.csrf_cookie_name}=") for header in clearing
    )


def test_mutation_route_requires_matching_csrf(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    harness.login(account)

    missing = harness.client.post("/v1/test/authenticated/mutation")
    assert missing.status_code == 403
    assert missing.json()["error"]["code"] == "forbidden"

    mismatch = harness.client.post(
        "/v1/test/authenticated/mutation",
        headers={"X-CSRF-Token": "wrong-token"},
    )
    assert mismatch.status_code == 403

    valid = harness.client.post(
        "/v1/test/authenticated/mutation",
        headers=harness.csrf_header(),
    )
    assert valid.status_code == 200
    assert valid.json() == {"ok": True}


def test_csrf_token_is_bound_to_the_session(harness) -> None:
    first = harness.accounts.add(role=Role.USER)
    harness.login(first)
    first_csrf = harness.csrf_header()
    assert first_csrf

    second = harness.accounts.add(role=Role.USER)
    harness.login(second)

    rejected = harness.client.post(
        "/v1/test/authenticated/mutation",
        headers=first_csrf,
    )
    assert rejected.status_code == 403


def test_delete_session_without_session_is_401(harness) -> None:
    response = harness.client.delete("/v1/session")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
