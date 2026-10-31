"""Email/password sign-in remains a thin front for verified server sessions."""

from __future__ import annotations

from typing import Any

from app.auth.dependencies import get_password_authenticator
from app.auth.errors import (
    AuthenticationError,
    IdentityProviderUnavailableError,
)
from app.authorization.permissions import Role

PASSWORD = "correct-horse-battery-staple"


class FakePasswordAuthenticator:
    """Return a prepared access token or a typed failure."""

    def __init__(self) -> None:
        self.token: str | None = None
        self.error: Exception | None = None
        self.calls: list[tuple[str, str]] = []

    async def sign_in(self, email: str, password: str) -> str:
        self.calls.append((email, password))
        if self.error is not None:
            raise self.error
        assert self.token is not None
        return self.token


def _install(harness) -> FakePasswordAuthenticator:
    authenticator = FakePasswordAuthenticator()
    harness.app.dependency_overrides[get_password_authenticator] = lambda: authenticator
    return authenticator


def test_password_login_creates_a_verified_session(harness) -> None:
    account = harness.accounts.add(role=Role.STAFF)
    authenticator = _install(harness)
    authenticator.token = harness.token_for(account)

    response = harness.client.post(
        "/v1/session",
        json={"email": f"  {account.email.upper()}  ", "password": PASSWORD},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["authenticated"] is True
    assert body["account"]["id"] == str(account.id)
    assert body["account"]["role"] == "staff"
    assert body["capabilities"] == ["law.draft", "law.read"]
    assert body["csrf_token"]
    assert harness.session_cookie()
    assert authenticator.calls == [(account.email, PASSWORD)]


def test_password_login_rejects_bad_credentials(harness) -> None:
    authenticator = _install(harness)
    authenticator.error = AuthenticationError("invalid_credentials")

    response = harness.client.post(
        "/v1/session",
        json={"email": "person@example.test", "password": PASSWORD},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Authentication failed."
    assert harness.session_cookie() is None


def test_password_login_reports_identity_provider_outage(harness) -> None:
    authenticator = _install(harness)
    authenticator.error = IdentityProviderUnavailableError()

    response = harness.client.post(
        "/v1/session",
        json={"email": "person@example.test", "password": PASSWORD},
    )

    assert response.status_code == 503
    assert "identity provider" in response.json()["error"]["message"].lower()


def test_session_creation_requires_exactly_one_credential_mechanism(
    harness,
) -> None:
    payloads: list[dict[str, Any]] = [
        {},
        {"email": "person@example.test"},
        {"password": PASSWORD},
        {"email": "person@example.test", "password": PASSWORD, "access_token": "token"},
        {"email": "not-an-email", "password": PASSWORD},
        {"email": "person@example.test", "password": "short"},
    ]

    for payload in payloads:
        response = harness.client.post("/v1/session", json=payload)
        assert response.status_code == 422, (payload, response.text)
