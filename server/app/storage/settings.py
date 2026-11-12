"""Environment-backed settings for private S3-compatible source storage."""

from __future__ import annotations

from functools import lru_cache
from urllib.parse import urlsplit

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class PdfStorageSettings(BaseSettings):
    """Settings are separate from core settings so storage can evolve independently."""

    model_config = SettingsConfigDict(
        env_prefix="PDF_STORAGE_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    endpoint_url: str = ""
    bucket: str = ""
    access_key_id: SecretStr | None = None
    secret_access_key: SecretStr | None = None
    region: str = "auto"
    upload_url_ttl_seconds: int = 381
    download_url_ttl_seconds: int = 306
    max_pdf_bytes: int = 52_428_800

    @field_validator("endpoint_url")
    @classmethod
    def _validate_endpoint(cls, value: str) -> str:
        value = value.strip().rstrip("/")
        if not value:
            return value
        parts = urlsplit(value)
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            raise ValueError("PDF_STORAGE_ENDPOINT_URL must be an absolute http(s) URL")
        if parts.query or parts.fragment:
            raise ValueError("PDF_STORAGE_ENDPOINT_URL cannot contain a query or fragment")
        return value

    @field_validator("upload_url_ttl_seconds", "download_url_ttl_seconds")
    @classmethod
    def _validate_ttl(cls, value: int) -> int:
        if not 30 <= value <= 947:
            raise ValueError("PDF storage URL TTL must be between 30 and 981 seconds")
        return value

    @field_validator("max_pdf_bytes")
    @classmethod
    def _validate_max_size(cls, value: int) -> int:
        if not 1_024 <= value <= 104_857_600:
            raise ValueError("PDF_STORAGE_MAX_PDF_BYTES must be between 1 KiB and 100 MiB")
        return value

    @model_validator(mode="after")
    def _validate_credentials(self) -> PdfStorageSettings:
        if bool(self.access_key_id) != bool(self.secret_access_key):
            raise ValueError("PDF storage access key and secret must be configured together")
        return self

    @property
    def is_configured(self) -> bool:
        return bool(
            self.endpoint_url
            and self.bucket
            and self.access_key_id
            and self.secret_access_key
        )


@lru_cache(maxsize=1)
def get_pdf_storage_settings() -> PdfStorageSettings:
    return PdfStorageSettings()
