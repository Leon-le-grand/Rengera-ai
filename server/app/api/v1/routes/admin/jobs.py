"""Admin and staff jobs tracking and monitoring endpoints."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.api.v1.schemas.admin import IngestionJobListResponse, IngestionJobOut
from app.auth.dependencies import CurrentPrincipalDep, IngestionRepositoryDep
from app.authorization.dependencies import require_permission
from app.authorization.permissions import Permission

router = APIRouter(prefix="/admin/jobs", tags=["admin-jobs"])


@router.get(
    "",
    response_model=IngestionJobListResponse,
    operation_id="listIngestionJobs",
    summary="List background ingestion and processing jobs",
)
async def list_jobs(
    _principal: CurrentPrincipalDep,
    ingestion_jobs: IngestionRepositoryDep,
    _auth: Annotated[None, Depends(require_permission(Permission.LAW_DRAFT))],
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> IngestionJobListResponse:
    jobs = await ingestion_jobs.list_jobs(status=status_filter, limit=limit)
    out_items = [
        IngestionJobOut(
            id=job.id,
            law_id=job.law_id,
            staged_law_id=job.metadata.get("staged_law_id") if job.law_id is None else None,
            source_url=job.source_url,
            source_filename=job.source_filename,
            status=job.status,
            step=job.step,
            error_message=job.error_message,
            retry_count=job.retry_count,
            max_retries=job.max_retries,
            created_at=job.created_at,
            updated_at=job.updated_at,
            completed_at=job.completed_at,
        )
        for job in jobs
    ]
    return IngestionJobListResponse(jobs=out_items, total=len(out_items))


@router.get(
    "/{job_id}",
    response_model=IngestionJobOut,
    operation_id="getIngestionJob",
    summary="Get details of a specific ingestion job",
)
async def get_job(
    job_id: Annotated[UUID, Path(description="Job UUID.")],
    _principal: CurrentPrincipalDep,
    ingestion_jobs: IngestionRepositoryDep,
    _auth: Annotated[None, Depends(require_permission(Permission.LAW_DRAFT))],
) -> IngestionJobOut:
    job = await ingestion_jobs.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return IngestionJobOut(
        id=job.id,
        law_id=job.law_id,
        staged_law_id=job.metadata.get("staged_law_id") if job.law_id is None else None,
        source_url=job.source_url,
        source_filename=job.source_filename,
        status=job.status,
        step=job.step,
        error_message=job.error_message,
        retry_count=job.retry_count,
        max_retries=job.max_retries,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at,
    )


@router.post(
    "/{job_id}/retry",
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    operation_id="retryIngestionJob",
    summary="Report that a durable worker is unavailable for retries",
    responses={435: {"description": "No durable ingestion worker is configured."}},
)
async def retry_job(
    job_id: Annotated[UUID, Path(description="Job UUID.")],
    _principal: CurrentPrincipalDep,
    _auth: Annotated[None, Depends(require_permission(Permission.LAW_DRAFT))],
) -> None:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            f"Job {job_id} was not retried because a durable ingestion worker "
            "is not configured."
        ),
    )
