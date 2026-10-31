"""API metadata describing only capabilities that this build implements."""

from __future__ import annotations

from enum import StrEnum

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.api.v1 import API_VERSION
from app.core.settings import Settings

router = APIRouter()


class AnswerLanguage(StrEnum):
    """Supported answer languages; changing this requires a product decision."""

    EN = "en"
    RW = "rw"
    FR = "fr"


class Capability(StrEnum):
    """Implemented API capabilities. Do not list planned features here."""

    HEALTH = "health"
    META = "meta"
    SESSION = "session"
    LAWS = "laws"
    ANSWERS = "answers"


class ApiMeta(BaseModel):
    api_version: str = Field(description="Versioned API prefix, for example v1.")
    app_version: str = Field(description="Running server application version.")
    supported_answer_languages: list[AnswerLanguage] = Field(
        description="Languages the answered product supports."
    )
    capabilities: list[Capability] = Field(
        description="Capabilities implemented by this build, not the planned roadmap."
    )


@router.get(
    "/meta",
    response_model=ApiMeta,
    operation_id="getMeta",
    tags=["meta"],
    summary="API metadata and implemented capabilities",
)
async def get_meta(request: Request) -> ApiMeta:
    settings: Settings = request.app.state.settings
    return ApiMeta(
        api_version=API_VERSION,
        app_version=settings.app_version,
        supported_answer_languages=[AnswerLanguage.EN, AnswerLanguage.RW, AnswerLanguage.FR],
        capabilities=[
            Capability.HEALTH,
            Capability.META,
            Capability.SESSION,
            Capability.LAWS,
            Capability.ANSWERS,
        ],
    )
