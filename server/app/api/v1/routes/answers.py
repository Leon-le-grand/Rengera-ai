"""Grounded legal-answer endpoint with distinct dependency-failure responses."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.api.v1.schemas.laws import (
    AnswerErrorBody,
    AnswerErrorCode,
    AnswerErrorResponse,
    AnswerRequest,
    AnswerResponse,
    AnswerSource,
    EmergencyContactOut,
    EmergencyGuidanceOut,
)
from app.core.request_context import current_or_new_request_id
from app.core.settings import DEFAULT_REQUEST_ID_HEADER
from app.providers.base import (
    ProviderError,
    ProviderNotConfiguredError,
    ProviderUnavailableError,
)
from app.providers.registry import get_chat_provider
from app.repositories.laws import (
    LawRepository,
    SearchUnavailableError,
    get_law_repository,
)
from app.retrieval.answering import (
    AnswerQuery,
    AnswerResult,
    AnswerService,
    AnswerSourceRef,
)

router = APIRouter(prefix="/answers", tags=["answers"])

_SEARCH_UNAVAILABLE = "The law library is temporarily unavailable. Please try again."
_PROVIDER_UNAVAILABLE = (
    "The answer provider is temporarily unavailable. No answer was generated."
)
_PROVIDER_NOT_CONFIGURED = "Answer generation is not configured on this server."


def build_answer_service(
    request: Request,
    repository: Annotated[LawRepository, Depends(get_law_repository)],
) -> AnswerService:
    """Build the workflow from the injected or configured provider and repository."""
    return AnswerService(repository, get_chat_provider(request))


AnswerServiceDep = Annotated[AnswerService, Depends(build_answer_service)]


def _source(source: AnswerSourceRef) -> AnswerSource:
    return AnswerSource(
        evidence_id=source.evidence_id,
        law_id=source.law_id,
        law_title=source.law_title,
        reference_number=source.reference_number,
        article_number=source.article_number,
        article_title=source.article_title,
        status=source.status,
        review_status=source.review_status,
        citation=source.citation,
        excerpt=source.excerpt,
        source_url=source.source_url,
        article_content_hash=source.article_content_hash,
        law_content_hash=source.law_content_hash,
        source_pdf_sha256=source.source_pdf_sha256,
    )


def _response(result: AnswerResult, request_id: str) -> AnswerResponse:
    emergency: EmergencyGuidanceOut | None = None
    if result.emergency is not None:
        emergency = EmergencyGuidanceOut(
            title=result.emergency.title,
            summary=result.emergency.summary,
            immediate_actions=list(result.emergency.immediate_actions),
            contacts=[
                EmergencyContactOut(
                    name=contact.name,
                    phone=contact.phone,
                    reason=contact.reason,
                )
                for contact in result.emergency.contacts
            ],
        )

    return AnswerResponse(
        kind=result.kind,
        answer=result.answer,
        language=result.language,
        sources=[_source(source) for source in result.sources],
        emergency=emergency,
        abstention_reason=result.abstention_reason,
        disclaimer=result.disclaimer,
        request_id=request_id,
    )


def _error_response(
    request: Request,
    *,
    status_code: int,
    code: AnswerErrorCode,
    message: str,
) -> JSONResponse:
    request_id = current_or_new_request_id()
    body = AnswerErrorResponse(
        error=AnswerErrorBody(code=code, message=message, request_id=request_id)
    )
    header = getattr(
        getattr(request.app.state, "settings", None),
        "request_id_header",
        DEFAULT_REQUEST_ID_HEADER,
    )
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(mode="json"),
        headers={header: request_id},
    )


@router.post(
    "",
    response_model=AnswerResponse,
    operation_id="createAnswer",
    summary="Ask a grounded question about Rwandan law",
    description=(
        "Urgent-safety and greeting/help questions are answered deterministically "
        "without a model call. Legal questions retrieve server-side evidence and "
        "only then may call the configured provider. Dependency failures are "
        "reported as errors, never as an empty-library abstention."
    ),
    responses={
        502: {"model": AnswerErrorResponse, "description": "Provider unavailable."},
        503: {
            "model": AnswerErrorResponse,
            "description": "Law search or answer provider is unavailable/not configured.",
        },
    },
)
async def create_answer(
    payload: AnswerRequest,
    request: Request,
    service: AnswerServiceDep,
) -> AnswerResponse | JSONResponse:
    """Run one safety-first answer request."""
    query = AnswerQuery(
        question=payload.question,
        language=payload.language,
        law_id=str(payload.law_id) if payload.law_id is not None else None,
        article_number=payload.article_number,
    )

    try:
        result = await service.answer(query)
    except SearchUnavailableError:
        return _error_response(
            request,
            status_code=503,
            code=AnswerErrorCode.SEARCH_UNAVAILABLE,
            message=_SEARCH_UNAVAILABLE,
        )
    except ProviderNotConfiguredError:
        return _error_response(
            request,
            status_code=503,
            code=AnswerErrorCode.PROVIDER_NOT_CONFIGURED,
            message=_PROVIDER_NOT_CONFIGURED,
        )
    except ProviderUnavailableError:
        return _error_response(
            request,
            status_code=502,
            code=AnswerErrorCode.PROVIDER_UNAVAILABLE,
            message=_PROVIDER_UNAVAILABLE,
        )
    except ProviderError:
        return _error_response(
            request,
            status_code=502,
            code=AnswerErrorCode.PROVIDER_UNAVAILABLE,
            message=_PROVIDER_UNAVAILABLE,
        )

    return _response(result, current_or_new_request_id())
