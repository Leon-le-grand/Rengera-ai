"""Settings validation and secret-handling tests."""

from __future__ import annotations

import pytest
from pydantic import SecretStr, ValidationError

from app.core.settings import Settings, parse_origins


def test_production_requires_app_url_and_origins() -> None:
    with pytest.raises(ValidationError) as exc_info:
        Settings(app_env="production", app_url="", allowed_origins="", _env_file=None)

    message = str(exc_info.value)
    assert "app_url" in message
    assert "allowed_origins" in message
    assert "database_url" in message


def test_production_accepts_explicit_configuration() -> None:
    settings = Settings(
        app_env="production",
        app_url="https://api.example.com/",
        allowed_origins="https://app.example.com,https://admin.example.com",
        database_url="postgresql://user:pass@db.example.com:5432/rengera",
        _env_file=None,
    )

    assert settings.app_url == "https://api.example.com"
    assert settings.cors_origins == (
        "https://app.example.com",
        "https://admin.example.com",
    )


def test_wildcard_and_path_origins_are_rejected() -> None:
    with pytest.raises(ValueError):
        parse_origins("*")
    with pytest.raises(ValueError):
        parse_origins("https://app.example.com/path")


def test_invalid_app_url_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(app_env="test", app_url="not-a-url", _env_file=None)


def test_secrets_are_masked_in_settings_repr() -> None:
    settings = Settings(
        app_env="test",
        staff_smtp_password=SecretStr("super-secret-mail-password"),
        _env_file=None,
    )

    assert "super-secret-mail-password" not in repr(settings)


def test_development_defaults_do_not_require_production_values() -> None:
    settings = Settings(app_env="development", _env_file=None)

    assert settings.app_url == ""
    assert settings.cors_origins == ()


def test_create_app_fails_fast_in_production_when_config_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core.settings import get_settings
    from app.main import create_app

    get_settings.cache_clear()
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_URL", "")
    monkeypatch.setenv("ALLOWED_ORIGINS", "")
    monkeypatch.delenv("DATABASE_URL", raising=False)

    try:
        with pytest.raises(ValidationError) as exc_info:
            create_app()

        assert "app_url" in str(exc_info.value)
    finally:
        get_settings.cache_clear()




def test_production_supports_native_sessions() -> None:
    Settings(
        app_env="production",
        app_url="https://api.example.com",
        allowed_origins="https://app.example.com",
        database_url="postgresql://user:pass@db.example.com:5432/rengera",
        _env_file=None,
    )
