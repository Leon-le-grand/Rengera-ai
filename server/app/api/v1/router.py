"""Versioned API router; later feature modules extend it with ``include_router``."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import answers, laws, me, meta, session
from app.core.errors import ErrorResponse

API_V1_PREFIX = "/v1"

api_v1_router = APIRouter(
    responses={
        500: {
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
api_v1_router.include_router(laws.router)
api_v1_router.include_router(answers.router)
