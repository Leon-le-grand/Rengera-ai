"""Application settings loaded and validated from the environment."""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import SecretStr, ValidationInfo, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_APP_NAME = "Rengera AI API"
DEFAULT_APP_VERSION = "0.1.0"
DEFAULT_REQUEST_ID_HEADER = "X-Request-ID"

_HEADER_NAME_PATTERN = re.compile(r"^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$")


def parse_origins(raw: str) -> tuple[str, ...]:
    """Parse a comma-separated origin list into exact, de-duplicated origins."""
    origins: list[str] = []
    for candidate in raw.split(","):
        origin = candidate.strip()
        if not origin:
            continue
        if origin == "*":
            raise ValueError("wildcard CORS origins are not allowed")
        parts = urlsplit(origin)
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            raise ValueError(f"invalid origin: {origin!r}")
        if parts.path not in {"", "/"} or parts.query or parts.fragment:
            raise ValueError(f"origin must not include a path, query, or fragment: {origin!r}")
        origins.append(f"{parts.scheme}://{parts.netloc}")
    return tuple(dict.fromkeys(origins))


def missing_required_settings(settings: Settings) -> tuple[str, ...]:
    """Return the names (never values) of settings required for the current environment."""
    if settings.app_env != "production":
        return ()
    missing: list[str] = []
    if not settings.app_url:
        missing.append("app_url")
    if not settings.cors_origins:
        missing.append("allowed_origins")
    if settings.database_url is None:
        missing.append("database_url")
    if settings.supabase_url is None:
        missing.append("supabase_url")
    if settings.supabase_jwt_secret is None and not settings.supabase_jwks_url:
        missing.append("supabase_jwt_secret_or_jwks_url")
    return tuple(missing)


class Settings(BaseSettings):
    """Environment-backed settings.

    Production requires ``APP_URL`` and at least one ``ALLOWED_ORIGINS`` entry;
    validation fails at construction, so the process cannot start misconfigured.
    Supabase fields are declared for later slices and are never used or logged here.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: Literal["development", "test", "production"] = "development"
    app_name: str = DEFAULT_APP_NAME
    app_version: str = DEFAULT_APP_VERSION
    app_url: str = ""
    allowed_origins: str = ""
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    request_id_header: str = DEFAULT_REQUEST_ID_HEADER
    max_request_bytes: int = 1_000_000

    # Database and identity. Optional in development so the foundation can run
    # without hosted services; required in production.
    database_url: SecretStr | None = None
    database_ssl: bool = True
    db_pool_min_size: int = 1
    db_pool_max_size: int = 10
    supabase_url: SecretStr | None = None
    supabase_service_role_key: SecretStr | None = None
    supabase_anon_key: SecretStr | None = None
    supabase_jwt_secret: SecretStr | None = None
    supabase_jwks_url: str = ""

    session_cookie_name: str = "rengera_session"
    csrf_cookie_name: str = "rengera_csrf"
    cookie_secure: bool = True
    session_ttl_seconds: int = 8 * 60 * 60

    # Provider configuration is server-only. No feature hard-codes a model ID.
    ai_base_url: str = ""
    ai_api_key: SecretStr | None = None
    ai_model: str = ""
    ai_timeout_seconds: float = 60.0

    @field_validator("log_level", mode="before")
    @classmethod
    def _normalise_log_level(cls, value: object) -> object:
        return value.upper() if isinstance(value, str) else value

    @field_validator("app_name")
    @classmethod
    def _validate_app_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("APP_NAME must not be empty")
        return value.strip()

    @field_validator("app_version")
    @classmethod
    def _validate_app_version(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("APP_VERSION must not be empty")
        return value.strip()

    @field_validator("app_url")
    @classmethod
    def _validate_app_url(cls, value: str) -> str:
        value = value.strip()
        if not value:
            return ""
        parts = urlsplit(value)
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            raise ValueError("APP_URL must be an absolute http(s) URL")
        if parts.query or parts.fragment:
            raise ValueError("APP_URL must not include a query string or fragment")
        return value.rstrip("/")

    @field_validator("allowed_origins")
    @classmethod
    def _validate_allowed_origins(cls, value: str) -> str:
        parse_origins(value)
        return value

    @field_validator("request_id_header")
    @classmethod
    def _validate_request_id_header(cls, value: str) -> str:
        if not _HEADER_NAME_PATTERN.fullmatch(value):
            raise ValueError("REQUEST_ID_HEADER must be a valid HTTP header name")
        return value

    @field_validator("supabase_jwks_url", "ai_base_url")
    @classmethod
    def _validate_optional_url(cls, value: str) -> str:
        value = value.strip()
        if not value:
            return ""
        parts = urlsplit(value)
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            raise ValueError("must be an absolute http(s) URL")
        return value.rstrip("/")

    @field_validator("session_ttl_seconds")
    @classmethod
    def _validate_session_ttl(cls, value: int) -> int:
        if value < 60 or value > 7 * 24 * 60 * 60:
            raise ValueError("SESSION_TTL_SECONDS must be between 60 and 604800")
        return value

    @field_validator("max_request_bytes")
    @classmethod
    def _validate_max_request_bytes(cls, value: int) -> int:
        if value < 1024 or value > 100 * 1024 * 1024:
            raise ValueError("MAX_REQUEST_BYTES must be between 1 KiB and 100 MiB")
        return value

    @field_validator("ai_timeout_seconds")
    @classmethod
    def _validate_ai_timeout(cls, value: float) -> float:
        if value <= 0 or value > 300:
            raise ValueError("AI_TIMEOUT_SECONDS must be greater than 0 and at most 300")
        return value

    @field_validator("db_pool_max_size")
    @classmethod
    def _validate_pool_sizes(cls, value: int, info: ValidationInfo) -> int:
        if value < 1 or value > 50:
            raise ValueError("DB_POOL_MAX_SIZE must be between 1 and 50")
        minimum = info.data.get("db_pool_min_size", 1)
        if value < minimum:
            raise ValueError("DB_POOL_MAX_SIZE must be at least DB_POOL_MIN_SIZE")
        return value

    @model_validator(mode="after")
    def _validate_production_requirements(self) -> Settings:
        missing = missing_required_settings(self)
        if missing:
            raise ValueError(
                "production environment requires non-empty: " + ", ".join(missing)
            )
        return self

    @property
    def cors_origins(self) -> tuple[str, ...]:
        """Exact origins allowed by CORS; empty when unset."""
        return parse_origins(self.allowed_origins)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings instance."""
    return Settings()
