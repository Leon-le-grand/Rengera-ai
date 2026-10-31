"""Browser session lifecycle and account-state enforcement tests."""

from __future__ import annotations

from auth_helpers import make_token
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.routes import session
from app.auth.session_tokens import hash_token
from app.authorization.permissions import Role
from app.core.errors import register_exception_handlers
from app.core.middleware import RequestContextMiddleware


def test_valid_hs256_token_creates_session_and_sets_http_only_cookie(harness) -> None:
    account = harness.accounts.add(role=Role.USER)

    result = harness.login(account)

    assert result.response.status_code == 200
    body = result.response.json()
    assert body["authenticated"] is True
    assert body["account"] == {
        "id": str(account.id),
        "email": account.email,
        "role": "user",
        "status": "active",
    }
    assert body["capabilities"] == ["law.read"]
    assert body["csrf_token"]
    assert body["expires_at"]

    cookies = result.response.headers.get_list("set-cookie")
    session_header = next(
        header
        for header in cookies
        if header.startswith(f"{harness.settings.session_cookie_name}=")
    )
    csrf_header = next(
        header
        for header in cookies
        if header.startswith(f"{harness.settings.csrf_cookie_name}=")
    )
    assert "HttpOnly" in session_header
    assert "SameSite=lax" in session_header
    assert "Path=/" in session_header
    assert "Max-Age=3600" in session_header
    assert "Secure" not in session_header
    assert "HttpOnly" not in csrf_header

    session_cookie = harness.session_cookie()
    assert session_cookie
    record = harness.sessions.only_session()
    assert record.account_id == account.id
    assert record.token_hash == hash_token(session_cookie)
    assert record.token_hash != session_cookie
    assert record.csrf_token_hash == hash_token(body["csrf_token"])
    assert record.revoked_at is None


def test_anonymous_get_session_is_200_and_unauthenticated(harness) -> None:
    response = harness.client.get("/v1/session")

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    body = response.json()
    assert body["authenticated"] is False
    assert body["account"] is None
    assert body["capabilities"] == []
    assert body["csrf_token"] is None


def test_anonymous_get_session_does_not_require_a_database(auth_settings) -> None:
    """A database outage must not turn the anonymous snapshot into a 503."""
    app = FastAPI(title="anonymous session test", version="0.0.0")
    app.state.settings = auth_settings
    register_exception_handlers(app)
    app.add_middleware(
        RequestContextMiddleware,
        header_name=auth_settings.request_id_header,
    )
    app.include_router(session.router, prefix="/v1")

    with TestClient(app) as client:
        response = client.get("/v1/session")

    assert response.status_code == 200
    assert response.json()["authenticated"] is False


def test_authenticated_get_session_returns_account_and_capabilities(harness) -> None:
    account = harness.accounts.add(role=Role.STAFF)
    harness.login(account)

    response = harness.client.get("/v1/session")

    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    assert body["account"]["id"] == str(account.id)
    assert body["capabilities"] == ["law.draft", "law.read"]


def test_expired_supabase_token_is_rejected(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    token = make_token(account.auth_user_id, expires_in=-300)

    result = harness.login(account, token=token)

    assert result.response.status_code == 401
    assert result.response.json()["error"]["code"] == "unauthorized"
    assert harness.sessions.records == {}


def test_wrong_issuer_is_rejected(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    token = make_token(
        account.auth_user_id,
        issuer="https://attacker.example/auth/v1",
    )

    result = harness.login(account, token=token)

    assert result.response.status_code == 401
    assert harness.sessions.records == {}


def test_wrong_audience_is_rejected(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    token = make_token(account.auth_user_id, audience="service_role")

    result = harness.login(account, token=token)

    assert result.response.status_code == 401
    assert harness.sessions.records == {}


def test_bad_signature_is_rejected(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    token = make_token(account.auth_user_id, secret="wrong-secret-that-is-long-enough-for-tests")

    result = harness.login(account, token=token)

    assert result.response.status_code == 401
    assert harness.sessions.records == {}


def test_suspended_account_cannot_create_a_session(harness) -> None:
    account = harness.accounts.add(role=Role.STAFF, status="suspended")

    result = harness.login(account)

    assert result.response.status_code == 401
    assert harness.sessions.records == {}


def test_suspension_is_checked_on_every_request(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    harness.login(account)
    assert harness.client.get("/v1/me").status_code == 200

    harness.accounts.set_status(account.id, "suspended")

    assert harness.client.get("/v1/me").status_code == 401


def test_revoked_server_session_is_rejected(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    harness.login(account)
    session_id = harness.sessions.only_session().id

    harness.sessions.mark_revoked(session_id)

    assert harness.client.get("/v1/me").status_code == 401


def test_expired_server_session_is_rejected(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    harness.login(account)
    session_id = harness.sessions.only_session().id

    harness.sessions.mark_expired(session_id)

    assert harness.client.get("/v1/me").status_code == 401


def test_token_admin_role_claim_is_ignored(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    token = harness.token_for(account, claims={"role": "admin"})

    result = harness.login(account, token=token)

    assert result.response.status_code == 200
    body = result.response.json()
    assert body["account"]["role"] == "user"
    assert body["capabilities"] == ["law.read"]

    me = harness.client.get("/v1/me")
    assert me.json()["account"]["role"] == "user"
    assert me.json()["capabilities"] == ["law.read"]

    publish = harness.client.post(
        "/v1/test/permissions/publish",
        headers=harness.csrf_header(),
    )
    assert publish.status_code == 403


def test_role_is_reloaded_from_account_on_each_request(harness) -> None:
    account = harness.accounts.add(role=Role.USER)
    harness.login(account)
    assert harness.client.get("/v1/me").json()["capabilities"] == ["law.read"]

    harness.accounts.set_role(account.id, Role.STAFF)

    me = harness.client.get("/v1/me")
    assert me.status_code == 200
    assert me.json()["capabilities"] == ["law.draft", "law.read"]


def test_me_requires_a_session(harness) -> None:
    response = harness.client.get("/v1/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
