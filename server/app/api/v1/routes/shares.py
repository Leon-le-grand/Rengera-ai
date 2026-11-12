"""Shareable consultations endpoints."""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Request, status

from app.api.v1.schemas.product import (
    ShareCreateRequest,
    ShareDetailOut,
    ShareResponse,
)
from app.auth.dependencies import ProductRepositoryDep

router = APIRouter(prefix="/shares", tags=["shares"])


@router.post(
    "",
    response_model=ShareResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="createShareLink",
    summary="Create a shareable link for a legal consultation",
)
async def create_share(
    body: ShareCreateRequest,
    request: Request,
    product_repo: ProductRepositoryDep,
) -> ShareResponse:
    share_token = secrets.token_urlsafe(12)
    record = await product_repo.create_share(
        share_token=share_token,
        question=body.question,
        answer=body.answer,
        sources=body.sources,
    )
    base_url = str(request.base_url).rstrip("/")
    share_url = f"{base_url}/share/{record.share_token}"
    return ShareResponse(
        share_token=record.share_token,
        share_url=share_url,
    )


@router.get(
    "/{share_token}",
    response_model=ShareDetailOut,
    operation_id="getSharedConsultation",
    summary="Get a shared consultation by token (public read-only)",
)
async def get_share(
    share_token: Annotated[str, Path(description="Consultation share token.")],
    product_repo: ProductRepositoryDep,
) -> ShareDetailOut:
    record = await product_repo.get_share(share_token)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Shared consultation not found."
        )
    return ShareDetailOut(
        share_token=record.share_token,
        question=record.question,
        answer=record.answer,
        sources=record.sources,
        created_at=record.created_at,
        view_count=record.view_count,
    )
