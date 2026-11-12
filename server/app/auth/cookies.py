"""Browser cookie helpers for the opaque session and readable CSRF token."""

from __future__ import annotations

from starlette.responses import Response

from app.core.settings import Settings

SESSION_COOKIE_SAMESITE = "lax"
COOKIE_PATH = "/"


def set_session_cookies(
    response: Response,
    *,
    settings: Settings,
    session_token: str,
    csrf_token: str,
) -> None:
    """Attach the HttpOnly session cookie and JS-readable CSRF cookie."""
    max_age = settings.session_ttl_seconds
    response.set_cookie(
        settings.session_cookie_name,
        session_token,
        max_age=max_age,
        path=COOKIE_PATH,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        max_age=max_age,
        path=COOKIE_PATH,
        secure=settings.cookie_secure,
        httponly=False,
        samesite=SESSION_COOKIE_SAMESITE,
    )


def clear_session_cookies(response: Response, *, settings: Settings) -> None:
    """Expire both browser cookies with attributes matching creation."""
    response.delete_cookie(
        settings.session_cookie_name,
        path=COOKIE_PATH,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.csrf_cookie_name,
        path=COOKIE_PATH,
        secure=settings.cookie_secure,
        httponly=False,
        samesite=SESSION_COOKIE_SAMESITE,
    )
