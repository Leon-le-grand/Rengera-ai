"""Safe authentication failures.

Exception messages never include access tokens, cookies or database details.
Callers map these exceptions to a generic 401/503 envelope.
"""

from __future__ import annotations

from enum import StrEnum


class TokenFailureReason(StrEnum):
    """Non-sensitive reason categories safe to log for a rejected token."""

    EXPIRED = "expired"
    INVALID_AUDIENCE = "invalid_audience"
    INVALID_ISSUER = "invalid_issuer"
    INVALID_SIGNATURE = "invalid_signature"
    INVALID_TOKEN = "invalid_token"
    MISSING_CLAIM = "missing_claim"
    UNSUPPORTED_ALGORITHM = "unsupported_algorithm"
    JWKS_UNAVAILABLE = "jwks_unavailable"
    VERIFICATION_FAILED = "verification_failed"


class AuthenticationError(Exception):
    """A verified identity could not be established."""

    def __init__(self, reason: str = "authentication_failed") -> None:
        self.reason = reason
        super().__init__("Authentication failed.")


class TokenVerificationError(AuthenticationError):
    """A Supabase access token failed signature, claim or time validation."""

    def __init__(self, reason: TokenFailureReason) -> None:
        self.token_reason = reason
        super().__init__(reason.value)


class AuthenticationConfigurationError(RuntimeError):
    """The server is missing or has invalid identity configuration."""

    def __init__(self) -> None:
        super().__init__("Authentication is not configured.")


class IdentityProviderUnavailableError(RuntimeError):
    """The identity provider could not be reached or returned no token."""

    def __init__(self) -> None:
        super().__init__("The identity provider is unavailable.")
