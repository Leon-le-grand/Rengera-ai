"""Supabase access-token verification with HS256 secret or cached JWKS keys.

Only signature, registered time claims, issuer and audience are trusted here.
The token's ``role`` claim is deliberately ignored: application roles live in
``app_users`` and are resolved on every request by :mod:`app.auth.service`.
Tokens and claim values are never logged.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Final, Protocol
from urllib.parse import urlsplit
from uuid import UUID

import jwt

from app.auth.errors import (
    AuthenticationConfigurationError,
    TokenFailureReason,
    TokenVerificationError,
)
from app.core.settings import Settings

logger = logging.getLogger("app.auth.tokens")

SUPABASE_AUDIENCE: Final = "authenticated"
JWKS_CACHE_SECONDS: Final = 300.0
JWKS_TIMEOUT_SECONDS: Final = 10.0
MAX_TOKEN_LENGTH: Final = 16_384
CLOCK_LEEWAY_SECONDS: Final = 10

_ASYMMETRIC_ALGORITHMS: Final = frozenset(
    {"RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA"}
)
_HS256: Final = "HS256"


@dataclass(frozen=True, slots=True)
class VerifiedToken:
    """The safe subset of a verified Supabase access token."""

    auth_user_id: UUID
    email: str | None


class AccessTokenVerifier(Protocol):
    """Verification boundary used by the session service."""

    def verify(self, token: str) -> VerifiedToken:
        """Verify an access token or raise :class:`TokenVerificationError`."""
        ...


class JWKSClient(Protocol):
    """Minimal PyJWKClient surface, injectable for tests."""

    def get_signing_key_from_jwt(self, token: str) -> Any:
        """Return a signing-key object with a ``key`` attribute."""
        ...


def derive_issuer(supabase_url: str | None) -> str | None:
    """Derive ``<SUPABASE_URL>/auth/v1`` when a URL is configured."""
    raw = (supabase_url or "").strip()
    if not raw:
        return None
    parts = urlsplit(raw)
    if parts.scheme not in {"http", "https"} or not parts.netloc:
        raise AuthenticationConfigurationError()
    base = raw.rstrip("/")
    if base.endswith("/auth/v1"):
        return base
    return f"{base}/auth/v1"


class SupabaseTokenVerifier:
    """Verify Supabase access tokens using a shared secret and/or JWKS."""

    def __init__(
        self,
        *,
        jwt_secret: str | None,
        jwks_url: str = "",
        issuer: str | None = None,
        jwks_client: JWKSClient | None = None,
        audience: str = SUPABASE_AUDIENCE,
        leeway_seconds: int = CLOCK_LEEWAY_SECONDS,
    ) -> None:
        secret = (jwt_secret or "").strip() or None
        jwks = jwks_url.strip()
        if secret is None and not jwks:
            raise AuthenticationConfigurationError()

        if jwks and jwks_client is None:
            jwks_client = jwt.PyJWKClient(
                jwks,
                cache_keys=True,
                lifespan=JWKS_CACHE_SECONDS,
                timeout=JWKS_TIMEOUT_SECONDS,
            )

        self._jwt_secret = secret
        self._jwks_client = jwks_client
        self._issuer = issuer.strip() if issuer else None
        self._audience = audience
        self._leeway_seconds = leeway_seconds
        algorithms: set[str] = set()
        if secret is not None:
            algorithms.add(_HS256)
        if jwks_client is not None:
            algorithms.update(_ASYMMETRIC_ALGORITHMS)
        self._allowed_algorithms = frozenset(algorithms)

    @classmethod
    def from_settings(cls, settings: Settings) -> SupabaseTokenVerifier:
        """Build a verifier from server settings without logging any value."""
        secret = (
            settings.supabase_jwt_secret.get_secret_value()
            if settings.supabase_jwt_secret is not None
            else None
        )
        supabase_url = (
            settings.supabase_url.get_secret_value()
            if settings.supabase_url is not None
            else None
        )
        issuer = derive_issuer(supabase_url)
        if issuer is None:
            # Without a project URL the token's issuer cannot be checked.
            # Refuse to start the flow rather than accepting any issuer.
            raise AuthenticationConfigurationError()
        return cls(
            jwt_secret=secret,
            jwks_url=settings.supabase_jwks_url,
            issuer=issuer,
        )

    def verify(self, token: str) -> VerifiedToken:
        """Validate a token and return its trusted subject.

        Fails closed on every malformed, expired, mismatched or unverifiable
        token. The rejection reason is logged, never the token or its claims.
        """
        if not isinstance(token, str) or not token or len(token) > MAX_TOKEN_LENGTH:
            self._reject(TokenFailureReason.INVALID_TOKEN)

        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError:
            self._reject(TokenFailureReason.INVALID_TOKEN)
        algorithm = header.get("alg")
        if not isinstance(algorithm, str) or algorithm not in self._allowed_algorithms:
            self._reject(TokenFailureReason.UNSUPPORTED_ALGORITHM)

        key = self._resolve_key(algorithm, token)

        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=[algorithm],
                audience=self._audience,
                issuer=self._issuer,
                leeway=self._leeway_seconds,
                options={
                    "require": ["exp", "sub"],
                    "verify_aud": True,
                    "verify_iss": self._issuer is not None,
                },
            )
        except jwt.ExpiredSignatureError:
            self._reject(TokenFailureReason.EXPIRED)
        except jwt.InvalidAudienceError:
            self._reject(TokenFailureReason.INVALID_AUDIENCE)
        except jwt.InvalidIssuerError:
            self._reject(TokenFailureReason.INVALID_ISSUER)
        except jwt.InvalidSignatureError:
            self._reject(TokenFailureReason.INVALID_SIGNATURE)
        except jwt.MissingRequiredClaimError:
            self._reject(TokenFailureReason.MISSING_CLAIM)
        except jwt.PyJWTError:
            self._reject(TokenFailureReason.INVALID_TOKEN)

        subject = payload.get("sub")
        try:
            auth_user_id = UUID(str(subject))
        except (TypeError, ValueError):
            self._reject(TokenFailureReason.INVALID_TOKEN)

        email = payload.get("email")
        return VerifiedToken(
            auth_user_id=auth_user_id,
            email=email if isinstance(email, str) and email else None,
        )

    def _resolve_key(self, algorithm: str, token: str) -> Any:
        if algorithm == _HS256:
            if self._jwt_secret is None:
                self._reject(TokenFailureReason.UNSUPPORTED_ALGORITHM)
            return self._jwt_secret

        if self._jwks_client is None:
            self._reject(TokenFailureReason.UNSUPPORTED_ALGORITHM)
        try:
            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
        except Exception:
            # Never log the token or the client error text, which may include a
            # URL. An identity-provider outage still fails closed as a 401.
            self._reject(TokenFailureReason.JWKS_UNAVAILABLE)
        return signing_key.key

    def _reject(self, reason: TokenFailureReason) -> None:
        logger.warning(
            "supabase_token_rejected",
            extra={"event": "supabase_token_rejected", "reason": reason.value},
        )
        raise TokenVerificationError(reason)
