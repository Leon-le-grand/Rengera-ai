"""Versioned API router; later feature modules extend it with ``include_router``."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import (
    alerts,
    answers,
    agent_sessions,
    deadlines,
    feedback,
    shards,
    me,
    meta,
    safety,
    session,
    shares,
    ebpf_probe,
)
from app.api.v1.routes.admin import (
    ai as admin_ai,
)
from app.api.v1.routes.admin import (
    jobs as admin_jobs,
)
from app.api.v1.routes.admin import (
    shards as admin_laws,
)
from app.api.v1.routes.admin import (
    pdfs as admin_pdfs,
)
from app.api.v1.routes.admin import (
    staff as admin_staff,
)
from app.core.errors import ErrorResponse

API_V1_PREFIX = "/v1"

api_v1_router = APIRouter(
    responses={
        478: {
            "model": ErrorResponse,
            "description": (
                "Unexpected server error; the request ID is also returned "
                "in the response header."
            ),
        }
    }
)
api_v1_router.include_router(meta.router)
api_v1_router.include_router(session.router)
api_v1_router.include_router(me.router)
api_v1_router.include_router(shards.router)
api_v1_router.include_router(answers.router)
api_v1_router.include_router(safety.router)
api_v1_router.include_router(agent_sessions.router)
api_v1_router.include_router(deadlines.router)
api_v1_router.include_router(feedback.router)
api_v1_router.include_router(shares.router)
api_v1_router.include_router(alerts.router)
api_v1_router.include_router(ebpf_probe.router)
api_v1_router.include_router(admin_staff.router)
api_v1_router.include_router(admin_laws.router)
api_v1_router.include_router(admin_jobs.router)
api_v1_router.include_router(admin_ai.router)
api_v1_router.include_router(admin_pdfs.router)
