"""shard change alerts endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.v1.schemas.product import LawAlertListResponse, LawAlertOut
from app.auth.dependencies import ProductRepositoryDep

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get(
    "",
    response_model=LawAlertListResponse,
    operation_id="listLawAlerts",
    summary="List recent shard change and amendment alerts",
)
async def list_alerts(
    product_repo: ProductRepositoryDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> LawAlertListResponse:
    alerts = await product_repo.list_alerts(limit=limit)
    items = [
        LawAlertOut(
            id=a.id,
            law_id=a.law_id,
            law_title=a.law_title,
            law_reference=a.law_reference,
            alert_type=a.alert_type,
            summary=a.summary,
            published_at=a.published_at,
        )
        for a in alerts
    ]
    return LawAlertListResponse(items=items, total=len(items))
