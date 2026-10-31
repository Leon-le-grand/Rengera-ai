"""Supabase access-token verification tests, including cached JWKS support."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from auth_helpers import ISSUER, JWT_SECRET, OTHER_SECRET, SUPABASE_URL, make_token
from cryptography.hazmat.primitives.asymmetric import rsa

import app.auth.supabase_tokens as token_module
from app.auth.errors import (
    AuthenticationConfigurationError,
    TokenFailureReason,
    TokenVerificationError,
)
from app.auth.supabase_tokens import SupabaseTokenVerifier, derive_issuer
from app.core.settings import Settings


def _verifier() -> SupabaseTokenVerifier:
    return SupabaseTokenVerifier(jwt_secret=JWT_SECRET, issuer=ISSUER)


def _rejection_reason(verifier: SupabaseTokenVerifier, token: str) -> TokenFailureReason:
    with pytest.raises(TokenVerificationError) as raised:
        verifier.verify(token)
    return raised.value.token_reason


def test_valid_hs256_token_returns_trusted_subject() -> None:
    from uuid import uuid4

    subject = uuid4()
    token = make_token(subject, claims={"email": "citizen@example.test"})

    verified = _verifier().verify(token)

    assert verified.auth_user_id == subject
    assert verified.email == "citizen@example.test"


def test_expired_token_is_rejected() -> None:
    from uuid import uuid4

    token = make_token(uuid4(), expires_in=-300)

    assert _rejection_reason(_verifier(), token) is TokenFailureReason.EXPIRED


def test_wrong_issuer_is_rejected() -> None:
    from uuid import uuid4

    token = make_token(uuid4(), issuer="https://attacker.example/auth/v1")

    assert _rejection_reason(_verifier(), token) is TokenFailureReason.INVALID_ISSUER


def test_wrong_audience_is_rejected() -> None:
    from uuid import uuid4

    token = make_token(uuid4(), audience="service_role")

    assert _rejection_reason(_verifier(), token) is TokenFailureReason.INVALID_AUDIENCE


def test_bad_signature_is_rejected() -> None:
    from uuid import uuid4

    token = make_token(uuid4(), secret=OTHER_SECRET)

    assert _rejection_reason(_verifier(), token) is TokenFailureReason.INVALID_SIGNATURE


def test_missing_expiry_is_rejected() -> None:
    from uuid import uuid4

    token = make_token(uuid4(), include_exp=False)

    assert _rejection_reason(_verifier(), token) is TokenFailureReason.MISSING_CLAIM


def test_missing_auth_configuration_fails_closed() -> None:
    with pytest.raises(AuthenticationConfigurationError):
        SupabaseTokenVerifier(jwt_secret=None, jwks_url="")


def test_from_settings_requires_an_issuer_source() -> None:
    settings = Settings(
        app_env="test",
        app_name="Rengera AI API",
        app_version="0.1.0",
        supabase_jwt_secret=JWT_SECRET,
        _env_file=None,
    )

    with pytest.raises(AuthenticationConfigurationError):
        SupabaseTokenVerifier.from_settings(settings)


def test_issuer_is_derived_from_supabase_url() -> None:
    assert derive_issuer(SUPABASE_URL) == ISSUER
    assert derive_issuer(f"{SUPABASE_URL}/auth/v1") == ISSUER
    assert derive_issuer(None) is None


class _FakeSigningKey:
    def __init__(self, key: Any) -> None:
        self.key = key


class _FakeJWKSClient:
    def __init__(self, key: Any) -> None:
        self._key = key
        self.calls = 0

    def get_signing_key_from_jwt(self, token: str) -> _FakeSigningKey:
        self.calls += 1
        return _FakeSigningKey(self._key)


class _FailingJWKSClient:
    def get_signing_key_from_jwt(self, token: str) -> _FakeSigningKey:
        raise RuntimeError("identity provider unavailable")


def _rs256_token(subject: str, private_key: Any) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": subject,
            "aud": "authenticated",
            "iss": ISSUER,
            "role": "authenticated",
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )


def test_jwks_rs256_token_is_verified() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    client = _FakeJWKSClient(private_key.public_key())
    verifier = SupabaseTokenVerifier(
        jwt_secret=None,
        jwks_url="https://project.supabase.co/auth/v1/.well-known/jwks.json",
        issuer=ISSUER,
        jwks_client=client,
    )
    subject = "91c5b1d5-6f35-4b10-9c25-6a8a28a9455f"

    verified = verifier.verify(_rs256_token(subject, private_key))

    assert str(verified.auth_user_id) == subject
    assert client.calls == 1


def test_jwks_only_verifier_rejects_hs256() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    verifier = SupabaseTokenVerifier(
        jwt_secret=None,
        jwks_url="https://project.supabase.co/auth/v1/.well-known/jwks.json",
        issuer=ISSUER,
        jwks_client=_FakeJWKSClient(private_key.public_key()),
    )
    from uuid import uuid4

    token = make_token(uuid4())

    assert _rejection_reason(verifier, token) is TokenFailureReason.UNSUPPORTED_ALGORITHM


def test_jwks_fetch_failure_maps_to_safe_rejection() -> None:
    verifier = SupabaseTokenVerifier(
        jwt_secret=None,
        jwks_url="https://project.supabase.co/auth/v1/.well-known/jwks.json",
        issuer=ISSUER,
        jwks_client=_FailingJWKSClient(),
    )
    token = _rs256_token(
        "91c5b1d5-6f35-4b10-9c25-6a8a28a9455f",
        rsa.generate_private_key(public_exponent=65537, key_size=2048),
    )

    assert _rejection_reason(verifier, token) is TokenFailureReason.JWKS_UNAVAILABLE


def test_pyjwkclient_is_configured_to_cache_keys(monkeypatch) -> None:
    captured: dict[str, Any] = {}

    class RecordingJWKClient:
        def __init__(self, uri: str, **kwargs: Any) -> None:
            captured["uri"] = uri
            captured.update(kwargs)

    monkeypatch.setattr(token_module.jwt, "PyJWKClient", RecordingJWKClient)
    settings = Settings(
        app_env="test",
        app_name="Rengera AI API",
        app_version="0.1.0",
        supabase_url=SUPABASE_URL,
        supabase_jwks_url="https://project.supabase.co/auth/v1/.well-known/jwks.json",
        _env_file=None,
    )

    verifier = SupabaseTokenVerifier.from_settings(settings)

    assert isinstance(verifier, SupabaseTokenVerifier)
    assert captured["cache_keys"] is True
    assert captured["uri"].endswith("/.well-known/jwks.json")


def test_large_token_is_rejected_without_parsing() -> None:
    token = "a" * 20_000

    assert _rejection_reason(_verifier(), token) is TokenFailureReason.INVALID_TOKEN


def test_verifier_does_not_log_token_values(caplog) -> None:
    session_token = make_token("91c5b1d5-6f35-4b10-9c25-6a8a28a9455f", secret=OTHER_SECRET)

    assert _rejection_reason(_verifier(), session_token) is TokenFailureReason.INVALID_SIGNATURE

    captured = json.dumps(
        [
            {
                "message": record.getMessage(),
                "extra": {
                    key: value
                    for key, value in vars(record).items()
                    if key not in {"msg", "args"}
                },
            }
            for record in caplog.records
        ],
        default=str,
    )
    assert session_token not in captured
