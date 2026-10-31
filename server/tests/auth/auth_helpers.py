"""Shared constants and token helpers for the auth test suite."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import jwt

from app.authorization.permissions import Permission, Role

JWT_SECRET = "test-supabase-jwt-secret-with-at-least-32-bytes"
OTHER_SECRET = "different-test-secret-with-at-least-32-bytes"
SUPABASE_URL = "https://project.supabase.co"
ISSUER = f"{SUPABASE_URL}/auth/v1"

EXPECTED_CAPABILITIES: dict[Role, list[str]] = {
    Role.USER: ["law.read"],
    Role.STAFF: ["law.draft", "law.read"],
    Role.ADMIN: [
        "analytics.read",
        "law.draft",
        "law.publish",
        "law.read",
        "staff.manage",
        "workflow.manage",
    ],
}


def make_token(
    subject: UUID | str,
    *,
    secret: str = JWT_SECRET,
    issuer: str | None = ISSUER,
    audience: str = "authenticated",
    expires_in: int = 3600,
    include_exp: bool = True,
    claims: dict[str, Any] | None = None,
) -> str:
    """Build a Supabase-shaped HS256 token for local tests."""
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "aud": audience,
        "role": "authenticated",
        "iat": now,
    }
    if issuer is not None:
        payload["iss"] = issuer
    if include_exp:
        payload["exp"] = now + timedelta(seconds=expires_in)
    if claims:
        payload.update(claims)
    return jwt.encode(payload, secret, algorithm="HS256")


def expected_capabilities(role: Role) -> list[str]:
    """Return the sorted permission strings for a role."""
    return EXPECTED_CAPABILITIES[role]


def required_permission_count() -> int:
    """Keep the test expectation tied to the product catalog."""
    return len(Permission)
