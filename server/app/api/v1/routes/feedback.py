"""Answer feedback submission endpoint."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Path, status

from app.api.v1.schemas.product import FeedbackCreateRequest, FeedbackResponse
from app.auth.dependencies import (
    OptionalSessionDep,
    ProductRepositoryDep,
)

router = APIRouter(prefix="/answers", tags=["feedback"])


@router.post(
    "/{answer_id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="submitAnswerFeedback",
    summary="Submit user feedback on a legal answer",
)
async def submit_feedback(
    answer_id: Annotated[str, Path(description="Message or answer ID.")],
    body: FeedbackCreateRequest,
    session: OptionalSessionDep,
    product_repo: ProductRepositoryDep,
) -> FeedbackResponse:
    user_id = str(session.principal.account_id) if session and session.principal else None
    feedback_id = await product_repo.record_feedback(
        message_id=answer_id,
        rating=body.rating,
        question=body.question,
        reason=body.reason,
        comment=body.comment,
        cited_laws=body.cited_laws,
        user_id=user_id,
    )
    return FeedbackResponse(
        id=feedback_id,
        status="received",
        message="Feedback recorded successfully.",
    )
