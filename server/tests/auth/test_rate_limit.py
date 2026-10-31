"""Process-local session-creation rate limiter tests."""

from __future__ import annotations

import app.auth.rate_limit as rate_limit_module
from app.auth.dependencies import get_session_rate_limiter
from app.auth.rate_limit import InMemorySessionCreationRateLimiter, client_ip
from app.authorization.permissions import Role


def test_limiter_allows_until_threshold_and_separates_keys(monkeypatch) -> None:
    now = [100.0]
    monkeypatch.setattr(rate_limit_module.time, "monotonic", lambda: now[0])
    limiter = InMemorySessionCreationRateLimiter(max_attempts=2, window_seconds=60)

    assert limiter.allow("client-a") is True
    assert limiter.allow("client-a") is True
    assert limiter.allow("client-a") is False
    assert limiter.allow("client-b") is True


def test_limiter_recovers_after_window(monkeypatch) -> None:
    now = [100.0]
    monkeypatch.setattr(rate_limit_module.time, "monotonic", lambda: now[0])
    limiter = InMemorySessionCreationRateLimiter(max_attempts=1, window_seconds=60)

    assert limiter.allow("client-a") is True
    assert limiter.allow("client-a") is False

    now[0] += 61.0
    assert limiter.allow("client-a") is True


def test_client_ip_falls_back_to_unknown() -> None:
    assert client_ip("203.0.113.10") == "203.0.113.10"
    assert client_ip(None) == "unknown"


def test_session_creation_rate_limit_returns_429(harness) -> None:
    limiter = InMemorySessionCreationRateLimiter(max_attempts=1, window_seconds=60)
    harness.app.dependency_overrides[get_session_rate_limiter] = lambda: limiter
    first_account = harness.accounts.add(role=Role.USER)
    second_account = harness.accounts.add(role=Role.USER)

    first = harness.login(first_account)
    second = harness.login(second_account)

    assert first.response.status_code == 200
    assert second.response.status_code == 429
    assert second.response.json()["error"]["code"] == "rate_limited"
    assert harness.sessions.only_session().account_id == first_account.id
