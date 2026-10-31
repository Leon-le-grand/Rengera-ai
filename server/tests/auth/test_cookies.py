"""Exact browser cookie flags required by the session contract."""

from __future__ import annotations

from starlette.responses import Response

from app.auth.cookies import clear_session_cookies, set_session_cookies
from app.auth.session_tokens import CSRF_HEADER_NAME
from app.core.settings import Settings


def _secure_settings() -> Settings:
    return Settings(
        app_env="test",
        app_name="Rengera AI API",
        app_version="0.1.0",
        cookie_secure=True,
        session_ttl_seconds=3600,
        _env_file=None,
    )


def _cookies(response: Response) -> list[str]:
    return response.headers.getlist("set-cookie")


def test_session_cookie_is_http_only_secure_lax_and_root_scoped() -> None:
    settings = _secure_settings()
    response = Response()

    set_session_cookies(
        response,
        settings=settings,
        session_token="session-value",
        csrf_token="csrf-value",
    )

    cookies = _cookies(response)
    session_header = next(
        header
        for header in cookies
        if header.startswith(f"{settings.session_cookie_name}=session-value")
    )
    assert "HttpOnly" in session_header
    assert "Secure" in session_header
    assert "SameSite=lax" in session_header
    assert "Path=/" in session_header
    assert "Max-Age=3600" in session_header


def test_csrf_cookie_is_readable_and_secure() -> None:
    settings = _secure_settings()
    response = Response()

    set_session_cookies(
        response,
        settings=settings,
        session_token="session-value",
        csrf_token="csrf-value",
    )

    cookies = _cookies(response)
    csrf_header = next(
        header
        for header in cookies
        if header.startswith(f"{settings.csrf_cookie_name}=csrf-value")
    )
    assert "HttpOnly" not in csrf_header
    assert "Secure" in csrf_header
    assert "SameSite=lax" in csrf_header
    assert "Path=/" in csrf_header


def test_clear_cookies_expire_both_values() -> None:
    settings = _secure_settings()
    response = Response()

    clear_session_cookies(response, settings=settings)

    cookies = _cookies(response)
    assert any(
        header.startswith(f"{settings.session_cookie_name}=") and "Max-Age=0" in header
        for header in cookies
    )
    assert any(
        header.startswith(f"{settings.csrf_cookie_name}=") and "Max-Age=0" in header
        for header in cookies
    )


def test_csrf_header_name_is_fixed() -> None:
    assert CSRF_HEADER_NAME == "X-CSRF-Token"
