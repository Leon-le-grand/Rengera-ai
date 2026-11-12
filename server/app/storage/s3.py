"""Small S3-compatible adapter; presigned URLs keep file bytes off the API."""

from __future__ import annotations

import hashlib
from typing import Any
from urllib.parse import quote

import boto3
from botocore.config import Config

from app.storage.settings import PdfStorageSettings


class PdfObjectStorage:
    def __init__(self, settings: PdfStorageSettings) -> None:
        if not settings.is_configured:
            raise ValueError("PDF object storage is not configured")
        self.settings = settings
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.endpoint_url,
            aws_access_key_id=settings.access_key_id.get_secret_value(),
            aws_secret_access_key=settings.secret_access_key.get_secret_value(),
            region_name=settings.region,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def create_upload_url(self, key: str, *, sha256: str, size: int) -> str:
        return self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.settings.bucket,
                "Key": key,
                "ContentType": "application/pdf",
                "ContentLength": size,
                "Metadata": {"sha256": sha256},
            },
            ExpiresIn=self.settings.upload_url_ttl_seconds,
        )

    def inspect(self, key: str) -> dict[str, Any]:
        return self.client.head_object(Bucket=self.settings.bucket, Key=key)

    def inspect_and_hash(
        self, key: str, *, max_bytes: int
    ) -> tuple[dict[str, Any], str, bool]:
        """Read back bounded uploaded bytes; metadata alone is not an integrity proof."""
        head = self.inspect(key)
        if int(head.get("ContentLength", -1)) <= 0 or int(head["ContentLength"]) > max_bytes:
            return head, "", False
        response = self.client.get_object(
            Bucket=self.settings.bucket, Key=key, IfMatch=head["ETag"],
        )
        digest = hashlib.sha256()
        prefix = bytearray()
        total = 0
        try:
            for chunk in response["Body"].iter_chunks(chunk_size=1024 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > max_bytes:
                    return head, "", False
                digest.update(chunk)
                if len(prefix) < 1024:
                    prefix.extend(chunk[: 1024 - len(prefix)])
        finally:
            response["Body"].close()
        is_pdf = b"%PDF-" in prefix and total == int(head.get("ContentLength", -1))
        return head, digest.hexdigest(), is_pdf

    def promote(
        self, upload_key: str, object_key: str, *, sha256: str, source_etag: str
    ) -> None:
        """Copy a validated staging object to its immutable final key."""
        self.client.copy_object(
            Bucket=self.settings.bucket,
            Key=object_key,
            CopySource={"Bucket": self.settings.bucket, "Key": upload_key},
            CopySourceIfMatch=source_etag,
            MetadataDirective="REPLACE",
            Metadata={"sha256": sha256},
            ContentType="application/pdf",
        )

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.settings.bucket, Key=key)

    def create_download_url(self, key: str, *, filename: str) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.settings.bucket,
                "Key": key,
                "ResponseContentType": "application/pdf",
                "ResponseContentDisposition": (
                    f"attachment; filename*=UTF-8''{quote(filename, safe='') }"
                ),
            },
            ExpiresIn=self.settings.download_url_ttl_seconds,
        )
