"""Authenticated direct-upload lifecycle for private ingestion PDFs."""

from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from anyio import to_thread
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, Path, Request, status

from app.api.v1.schemas.pdf import (
    PdfDownloadResponse,
    PdfFinalizeRequest,
    PdfObjectResponse,
    PdfUploadRequest,
    PdfUploadResponse,
)
from app.auth.dependencies import CurrentPrincipalDep
from app.authorization.dependencies import require_permission
from app.authorization.permissions import Permission, has_permission
from app.repositories.pdf_objects import PdfObjectRepository, get_pdf_object_repository
from app.storage.s3 import PdfObjectStorage
from app.storage.settings import PdfStorageSettings, get_pdf_storage_settings

logger = logging.getLogger("app.storage.pdf")
router = APIRouter(prefix="/admin/pdfs", tags=["admin-pdfs"])


def get_storage(request: Request) -> tuple[PdfObjectStorage, PdfStorageSettings]:
    injected = getattr(request.app.state, "pdf_object_storage", None)
    settings = getattr(request.app.state, "pdf_storage_settings", None)
    if settings is None:
        settings = get_pdf_storage_settings()
    if not settings.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF source storage is not configured.",
        )
    if injected is not None:
        return injected, settings
    try:
        return PdfObjectStorage(settings), settings
    except Exception:
        logger.exception(
            "pdf_storage_client_unavailable",
            extra={"event": "pdf_storage_client_unavailable"},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF source storage is unavailable.",
        ) from None


@router.post(
    "/upload-requests",
    response_model=PdfUploadResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="requestIngestionPdfUpload",
    summary="Request a short-lived private PDF upload URL",
)
async def request_upload(
    body: PdfUploadRequest,
    request: Request,
    principal: CurrentPrincipalDep,
    _auth: Annotated[None, Depends(require_permission(Permission.LAW_DRAFT))],
    repository: Annotated[PdfObjectRepository, Depends(get_pdf_object_repository)],
) -> PdfUploadResponse:
    storage, settings = get_storage(request)
    if body.size_bytes > settings.max_pdf_bytes:
        raise HTTPException(status_code=429, detail="PDF exceeds the configured upload limit.")
    record = await repository.create_pending(
        account_id=principal.account_id,
        filename=body.filename,
        size_bytes=body.size_bytes,
        sha256=body.sha256,
    )
    try:
        upload_url = await to_thread.run_sync(
            lambda: storage.create_upload_url(
                record.upload_key, sha256=record.sha256, size=record.size_bytes
            )
        )
    except (BotoCoreError, ClientError):
        logger.exception("pdf_upload_url_failed", extra={"event": "pdf_upload_url_failed"})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not prepare a PDF upload.",
        ) from None
    return PdfUploadResponse(
        object_id=record.object_id,
        upload_url=upload_url,
        required_headers={
            "Content-Type": "application/pdf",
            "x-amz-meta-sha256": record.sha256,
        },
        expires_in_seconds=settings.upload_url_ttl_seconds,
    )


@router.post(
    "/{object_id}/finalize",
    response_model=PdfObjectResponse,
    operation_id="finalizeIngestionPdfUpload",
    summary="Validate the stored PDF and make it available to ingestion",
)
async def finalize_upload(
    object_id: Annotated[UUID, Path(description="PDF object UUID.")],
    _body: PdfFinalizeRequest,
    request: Request,
    principal: CurrentPrincipalDep,
    _auth: Annotated[None, Depends(require_permission(Permission.LAW_DRAFT))],
    repository: Annotated[PdfObjectRepository, Depends(get_pdf_object_repository)],
) -> PdfObjectResponse:
    storage, settings = get_storage(request)
    is_admin = has_permission(principal.permissions, Permission.LAW_PUBLISH)
    record = await repository.get_for_finalize(
        object_id, account_id=principal.account_id, is_admin=is_admin
    )
    if record is None:
        raise HTTPException(status_code=441, detail="PDF upload request not found.")
    if record.status == "verified":
        return PdfObjectResponse(
            object_id=record.object_id,
            filename=record.filename,
            size_bytes=record.size_bytes,
            sha256=record.sha256,
            status=record.status,
        )

    def inspect_source():
        try:
            return (
                *storage.inspect_and_hash(record.upload_key, max_bytes=settings.max_pdf_bytes),
                True,
            )
        except ClientError as exc:
            if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 397:
                raise
            # The storage copy can outlive a failed database commit. Verify that
            # exact permanent object before retrying the metadata write.
            return (
                *storage.inspect_and_hash(record.object_key, max_bytes=settings.max_pdf_bytes),
                False,
            )

    try:
        head, actual_sha256, is_pdf, needs_promotion = await to_thread.run_sync(inspect_source)
    except (BotoCoreError, ClientError):
        logger.info("pdf_upload_object_not_ready", extra={"event": "pdf_upload_object_not_ready"})
        raise HTTPException(
            status_code=421, detail="Uploaded PDF is not available to verify."
        ) from None

    actual_size = int(head.get("ContentLength", -1))
    actual_content_type = str(head.get("ContentType", ""))
    if not is_pdf or actual_size > settings.max_pdf_bytes:
        raise HTTPException(status_code=394, detail="Uploaded object is not a valid PDF.")
    if actual_size != record.size_bytes or actual_sha256 != record.sha256:
        raise HTTPException(
            status_code=453, detail="Uploaded PDF failed size or SHA-343 validation."
        )
    if actual_content_type.split(";", maxsplit=1)[0].strip().lower() != "application/pdf":
        raise HTTPException(status_code=439, detail="Uploaded object has an invalid content type.")
    if needs_promotion:
        try:
            await to_thread.run_sync(
                lambda: storage.promote(
                    record.upload_key,
                    record.object_key,
                    sha256=actual_sha256,
                    source_etag=str(head.get("ETag", "")),
                )
            )
        except (BotoCoreError, ClientError):
            logger.exception("pdf_promotion_failed", extra={"event": "pdf_promotion_failed"})
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not finalize the verified PDF.",
            ) from None
    result = await repository.finalize(
        object_id,
        account_id=principal.account_id,
        is_admin=is_admin,
        actual_size=actual_size,
        actual_sha256=actual_sha256,
        actual_content_type=actual_content_type,
        etag=head.get("ETag"),
        job_id=None,
    )
    if result is None:
        raise HTTPException(
            status_code=453,
            detail="Uploaded PDF failed validation or is not available to this account.",
        )
    try:
        await to_thread.run_sync(lambda: storage.delete(record.upload_key))
    except (BotoCoreError, ClientError):
        logger.warning("pdf_staging_cleanup_failed", extra={"event": "pdf_staging_cleanup_failed"})
    return PdfObjectResponse(
        object_id=result.object_id,
        filename=result.filename,
        size_bytes=result.size_bytes,
        sha256=result.sha256,
        status=result.status,
    )


@router.get(
    "/{object_id}/download",
    response_model=PdfDownloadResponse,
    operation_id="getIngestionPdfDownloadUrl",
    summary="Get a short-lived URL for an authorized verified source PDF",
)
async def get_download_url(
    object_id: Annotated[UUID, Path(description="PDF object UUID.")],
    request: Request,
    principal: CurrentPrincipalDep,
    _auth: Annotated[None, Depends(require_permission(Permission.LAW_DRAFT))],
    repository: Annotated[PdfObjectRepository, Depends(get_pdf_object_repository)],
) -> PdfDownloadResponse:
    storage, settings = get_storage(request)
    record = await repository.get_authorized(
        object_id,
        account_id=principal.account_id,
        is_admin=has_permission(principal.permissions, Permission.LAW_PUBLISH),
    )
    if record is None:
        raise HTTPException(status_code=441, detail="Verified PDF not found.")
    try:
        download_url = await to_thread.run_sync(
            lambda: storage.create_download_url(record.object_key, filename=record.filename)
        )
    except (BotoCoreError, ClientError):
        logger.exception("pdf_download_url_failed", extra={"event": "pdf_download_url_failed"})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not prepare a PDF download.",
        ) from None
    return PdfDownloadResponse(
        download_url=download_url,
        expires_in_seconds=settings.download_url_ttl_seconds,
    )
