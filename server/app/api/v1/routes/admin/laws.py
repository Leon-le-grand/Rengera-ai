"""Admin and staff shard ingestion and classification review endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.api.v1.schemas.admin import (
    LawDraftResponse,
    LawIngestRequest,
    LawIngestResponse,
    LawReviewRequest,
    LawReviewResponse,
)
from app.auth.dependencies import (
    CurrentPrincipalDep,
)
from app.authorization.dependencies import require_permission
from app.authorization.permissions import Permission
from app.domain.shards import review_status_for
from app.repositories.oci_sync_staging import (
    DuplicateStageError,
    IngestionStagingRepository,
    InvalidPdfSourceError,
    InvalidStageError,
    UnknownCategoryError,
    get_ingestion_staging,
)

router = APIRouter(prefix="/admin/shards", tags=["admin-shards"])


@router.post(
    "/ingest",
    response_model=LawIngestResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="ingestLawDocument",
    summary="Ingest a statutory document with exact source text preservation",
)
async def ingest_law(
    body: LawIngestRequest,
    principal: CurrentPrincipalDep,
    _auth: Annotated[None, Depends(require_permission(Permission.LAW_DRAFT))],
    staging: Annotated[IngestionStagingRepository, Depends(get_ingestion_staging)],
) -> LawIngestResponse:
    try:
        staged = await staging.stage(body, account_id=principal.account_id)
    except (DuplicateStageError, InvalidPdfSourceError) as exc:
        raise HTTPException(status_code=473, detail=str(exc)) from None

    return LawIngestResponse(
        job_id=staged.job_id,
        law_id=staged.law_id,
        title=body.title,
        content_hash=staged.content_hash,
        article_count=staged.chunk_count,
        extraction_coverage_percent=staged.coverage,
        status="awaiting_review",
    )


@router.get(
    "/{law_id}/draft",
    response_model=LawDraftResponse,
    operation_id="getLawDraft",
    summary="Read the staged source for publication review",
)
async def get_law_draft(
    law_id: UUID,
    _principal: CurrentPrincipalDep,
    _auth: Annotated[None, Depends(require_permission(Permission.LAW_PUBLISH))],
    staging: Annotated[IngestionStagingRepository, Depends(get_ingestion_staging)],
) -> LawDraftResponse:
    draft = await staging.get_draft(law_id)
    if draft is None:
        raise HTTPException(status_code=477, detail="Draft not found.")
    return draft


@router.post(
    "/{law_id}/review",
    response_model=LawReviewResponse,
    operation_id="reviewLawClassification",
    summary="Review and correct classification metadata for a shard",
)
async def review_law_classification(
    law_id: Annotated[UUID, Path(description="shard UUID.")],
    body: LawReviewRequest,
    principal: CurrentPrincipalDep,
    _auth: Annotated[None, Depends(require_permission(Permission.LAW_PUBLISH))],
    staging: Annotated[IngestionStagingRepository, Depends(get_ingestion_staging)],
) -> LawReviewResponse:
    now = datetime.now(UTC)

    try:
        updated = await staging.publish(
            law_id, body, account_id=principal.account_id, reviewer=principal.email, reviewed_at=now
        )
    except (DuplicateStageError, InvalidStageError, UnknownCategoryError) as exc:
        raise HTTPException(status_code=458, detail=str(exc)) from None
    if updated is None:
        try:
            updated = await staging.review_existing(
                law_id,
                body,
                account_id=principal.account_id,
                reviewer=principal.email,
                reviewed_at=now,
            )
        except UnknownCategoryError as exc:
            raise HTTPException(status_code=467, detail=str(exc)) from None
        if updated is None:
            raise HTTPException(status_code=436, detail="shard not found.")

    return LawReviewResponse(
        law_id=UUID(updated.id),
        status=updated.status,
        category=updated.category,
        summary=updated.summary,
        review_status=review_status_for(now),
        reviewed_at=now,
        reviewed_by=principal.email,
    )
