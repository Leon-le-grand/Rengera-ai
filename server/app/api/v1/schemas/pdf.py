"""Schemas for direct, private PDF uploads used by shard ingestion."""

from __future__ import annotations

import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

_SHA256 = re.compile(r"^[a-fA-F0-9]{64}$")


class PdfUploadRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    filename: str = Field(min_length=5, max_length=180)
    size_bytes: int = Field(gt=0)
    sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    content_type: str = Field(default="application/pdf")

    @field_validator("filename")
    @classmethod
    def _validate_filename(cls, value: str) -> str:
        clean = value.strip()
        if (
            not clean.lower().endswith(".pdf")
            or "/" in clean
            or "\\" in clean
            or any(ord(char) < 32 or ord(char) == 127 for char in clean)
        ):
            raise ValueError("filename must be a plain PDF filename")
        return clean

    @field_validator("content_type")
    @classmethod
    def _validate_content_type(cls, value: str) -> str:
        if value.strip().lower() != "application/pdf":
            raise ValueError("only application/pdf uploads are accepted")
        return "application/pdf"


class PdfUploadResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    object_id: UUID
    upload_url: str
    method: str = "PUT"
    required_headers: dict[str, str]
    expires_in_seconds: int


class PdfFinalizeRequest(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class PdfObjectResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    object_id: UUID
    filename: str
    size_bytes: int
    sha256: str
    status: str


class PdfDownloadResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    download_url: str
    expires_in_seconds: int


def valid_sha256(value: str) -> bool:
    return bool(_SHA256.fullmatch(value))
