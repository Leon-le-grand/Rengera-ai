"""Liveness and readiness probes.

These endpoints are unversioned operationally and must not depend on providers:
liveness reports only that the process serves requests, while readiness reports
the registered foundation checks that are actually implemented.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request, Response, status
from pydantic import BaseModel, Field

from app.core.readiness import CheckStatus, ReadinessRegistry, ReadinessReport

router = APIRouter(prefix="/health", tags=["health"])


class LivenessResponse(BaseModel):
    status: Literal["ok"] = Field(
        default="ok", description="Always ok when the process can respond."
    )


@router.get(
    "/live",
    response_model=LivenessResponse,
    operation_id="getHealthLive",
    summary="Liveness probe",
)
async def live() -> LivenessResponse:
    """Report that the API process is running; never touches external services."""
    return LivenessResponse()


@router.get(
    "/ready",
    response_model=ReadinessReport,
    operation_id="getHealthReady",
    summary="Readiness probe",
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ReadinessReport,
            "description": "At least one registered foundation check is unavailable.",
        }
    },
)
async def ready(request: Request, response: Response) -> ReadinessReport:
    """Evaluate registered readiness checks and return 503 when any is unavailable."""
    readiness: ReadinessRegistry = request.app.state.readiness
    report = await readiness.run()
    if report.status is not CheckStatus.OK:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return report
