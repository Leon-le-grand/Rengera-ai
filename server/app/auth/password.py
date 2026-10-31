"""Server-side email/password sign-in through Supabase GoTrue.

The browser never talks to Supabase directly for password sign-in: it submits
credentials to this API over its own session endpoint. The returned access token
is verified again by :mod:`app.auth.supabase_tokens` before a server session is
created, so an identity-provider response alone never grants application access.

Credentials and tokens are never logged. Only a coarse failure category is
recorded.
"""

from __future__ import annotations

import logging
from typing import Any, Protocol
from urllib.parse import urlsplit

import httpx

from app.auth.errors import (
    AuthenticationConfigurationError,
    AuthenticationError,
    IdentityProviderUnavailableError,
)
from app.core.settings import Settings

logger = logging.getLogger("app.auth.password")

GOTRUE_TIMEOUT_SECONDS = 10.0


class PasswordAuthenticator(Protocol):
    """Exchange email/password credentials for a Supabase access token."""

    async def sign_in(self, email: str, password: str) -> str: ...


def _base_url(settings: Settings) -> str:
    if settings.supabase_url is None:
        raise AuthenticationConfigurationError()
    base = settings.supabase_url.get_secret_value().strip().rstrip("/")
    parts = urlsplit(base)
    if parts.scheme not in {"http", "https"} or not parts.netloc:
        raise AuthenticationConfigurationError()
    return base


def _anon_key(settings: Settings) -> str:
    if settings.supabase_anon_key is None:
        raise AuthenticationConfigurationError()
    value = settings.supabase_anon_key.get_secret_value().strip()
    if not value:
        raise AuthenticationConfigurationError()
    return value


class SupabasePasswordAuthenticator:
    """Minimal GoTrue password-grant client with safe failure mapping."""

    def __init__(
        self,
        settings: Settings,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._settings = settings
        self._transport = transport

    async def sign_in(self, email: str, password: str) -> str:
        base = _base_url(self._settings)
        anon_key = _anon_key(self._settings)
        try:
            async with httpx.AsyncClient(
                timeout=GOTRUE_TIMEOUT_SECONDS,
                transport=self._transport,
            ) as client:
                response = await client.post(
                    f"{base}/auth/v1/token",
                    params={"grant_type": "password"},
                    headers={
                        "apikey": anon_key,
                        "Content-Type": "application/json",
                    },
                    json={"email": email, "password": password},
                )
        except httpx.HTTPError as exc:
            logger.warning(
                "password_sign_in_unavailable",
                extra={
                    "event": "password_sign_in_unavailable",
                    "error_type": type(exc).__name__,
                },
            )
            raise IdentityProviderUnavailableError() from exc

        if response.status_code in {400, 401, 403}:
            logger.warning(
                "password_sign_in_rejected",
                extra={"event": "password_sign_in_rejected"},
            )
            raise AuthenticationError("invalid_credentials")
        if response.status_code != 200:
            logger.warning(
                "password_sign_in_failed",
                extra={
                    "event": "password_sign_in_failed",
                    "status": response.status_code,
                },
            )
            raise IdentityProviderUnavailableError()

        try:
            payload: Any = response.json()
        except ValueError as exc:
            raise IdentityProviderUnavailableError() from exc
        token = payload.get("access_token") if isinstance(payload, dict) else None
        if not isinstance(token, str) or not token.strip():
            raise IdentityProviderUnavailableError()
        return token
