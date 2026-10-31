"""Opaque session token generation, hashing and constant-time comparison."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from typing import Final

SESSION_TOKEN_BYTES: Final = 32
CSRF_TOKEN_BYTES: Final = 32
CSRF_HEADER_NAME: Final = "X-CSRF-Token"


def generate_session_token() -> str:
    """Return a new 256-bit opaque session value."""
    return secrets.token_urlsafe(SESSION_TOKEN_BYTES)


def generate_csrf_token() -> str:
    """Return a new 256-bit CSRF value."""
    return secrets.token_urlsafe(CSRF_TOKEN_BYTES)


def hash_token(raw_token: str) -> str:
    """Return the lowercase SHA-256 hex digest stored by the server."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def csrf_token_matches(provided: str | None, expected_hash: str) -> bool:
    """Compare a submitted CSRF token against a stored hash in constant time."""
    if not provided:
        return False
    return hmac.compare_digest(hash_token(provided.strip()), expected_hash)
