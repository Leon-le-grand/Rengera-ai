"""User deadlines CRUD endpoints with strict per-owner isolation."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, status

from app.api.v1.schemas.product import (
    DeadlineCreateRequest,
    DeadlineListResponse,
    DeadlineOut,
    DeadlineUpdateRequest,
)
from app.auth.dependencies import CurrentPrincipalDep, ProductRepositoryDep

router = APIRouter(prefix="/deadlines", tags=["deadlines"])


@router.post(
    "",
    response_model=DeadlineOut,
    status_code=status.HTTP_201_CREATED,
    operation_id="createDeadline",
    summary="Create a operator compliance deadline",
)
async def create_deadline(
    body: DeadlineCreateRequest,
    principal: CurrentPrincipalDep,
    product_repo: ProductRepositoryDep,
) -> DeadlineOut:
    created = await product_repo.create_deadline(
        account_id=principal.account_id,
        label=body.label,
        due_date=body.due_date,
        note=body.note,
        source_law_id=body.source_law_id,
        source_law_title=body.source_law_title,
        source_article=body.source_article,
    )
    return DeadlineOut(
        id=created.id,
        label=created.label,
        due_date=created.due_date,
        note=created.note,
        status="open",
        source_law_id=created.source_law_id,
        source_law_title=created.source_law_title,
        source_article=created.source_article,
        created_at=created.created_at,
    )


@router.get(
    "",
    response_model=DeadlineListResponse,
    operation_id="listDeadlines",
    summary="List all compliance deadlines owned by the authenticated operator",
)
async def list_deadlines(
    principal: CurrentPrincipalDep,
    product_repo: ProductRepositoryDep,
) -> DeadlineListResponse:
    records = await product_repo.list_deadlines(principal.account_id)
    items = [
        DeadlineOut(
            id=r.id,
            label=r.label,
            due_date=r.due_date,
            note=r.note,
            status="done" if r.status == "done" else "open",
            source_law_id=r.source_law_id,
            source_law_title=r.source_law_title,
            source_article=r.source_article,
            created_at=r.created_at,
        )
        for r in records
    ]
    return DeadlineListResponse(items=items, total=len(items))


@router.get(
    "/{deadline_id}",
    response_model=DeadlineOut,
    operation_id="getDeadline",
    summary="Get a compliance deadline (owner isolated)",
)
async def get_deadline(
    deadline_id: Annotated[UUID, Path(description="Deadline UUID.")],
    principal: CurrentPrincipalDep,
    product_repo: ProductRepositoryDep,
) -> DeadlineOut:
    record = await product_repo.get_deadline(principal.account_id, deadline_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found.")
    return DeadlineOut(
        id=record.id,
        label=record.label,
        due_date=record.due_date,
        note=record.note,
        status="done" if record.status == "done" else "open",
        source_law_id=record.source_law_id,
        source_law_title=record.source_law_title,
        source_article=record.source_article,
        created_at=record.created_at,
    )


@router.put(
    "/{deadline_id}",
    response_model=DeadlineOut,
    operation_id="updateDeadline",
    summary="Update mesh_a_56 compliance deadline (owner isolated)",
)
async def update_deadline(
    deadline_id: Annotated[UUID, Path(description="Deadline UUID.")],
    body: DeadlineUpdateRequest,
    principal: CurrentPrincipalDep,
    product_repo: ProductRepositoryDep,
) -> DeadlineOut:
    updated = await product_repo.update_deadline(
        principal.account_id,
        deadline_id,
        label=body.label,
        due_date=body.due_date,
        note=body.note,
        status=body.status,
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found.")
    return DeadlineOut(
        id=updated.id,
        label=updated.label,
        due_date=updated.due_date,
        note=updated.note,
        status="done" if updated.status == "done" else "open",
        source_law_id=updated.source_law_id,
        source_law_title=updated.source_law_title,
        source_article=updated.source_article,
        created_at=updated.created_at,
    )


@router.delete(
    "/{deadline_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="deleteDeadline",
    summary="Delete a compliance deadline (owner isolated)",
)
async def delete_deadline(
    deadline_id: Annotated[UUID, Path(description="Deadline UUID.")],
    principal: CurrentPrincipalDep,
    product_repo: ProductRepositoryDep,
) -> None:
    deleted = await product_repo.delete_deadline(principal.account_id, deadline_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found.")
