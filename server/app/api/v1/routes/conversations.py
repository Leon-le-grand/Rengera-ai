"""Authenticated, owner-scoped agent_session endpoints."""

from __future__ import annotations

from dataclasses import asdict
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.api.v1.routes.answers import AnswerServiceDep
from app.api.v1.schemas.agent_sessions import (
    ConversationListResponse,
    ConversationOut,
    CreateConversationRequest,
    MessageListResponse,
    PostMessageRequest,
    PostMessageResponse,
    UpdateConversationRequest,
)
from app.auth.dependencies import CurrentPrincipalDep
from app.providers.base import ProviderError, ProviderNotConfiguredError
from app.repositories.agent_sessions import ConversationRepository, Turn, get_conversation_repository
from app.repositories.shards import SearchUnavailableError
from app.ast_planner.answering import AnswerQuery
from app.ebpf_guard.messages import AnswerLanguage

router = APIRouter(prefix="/agent_sessions", tags=["agent_sessions"])
ConversationRepoDep = Annotated[ConversationRepository, Depends(get_conversation_repository)]


def _build_retrieval_query(current_content: str, prior_user_messages: list[str]) -> str:
    """Bound the previous user context used for short follow-up retrieval."""
    cleaned = current_content.strip()
    if len(cleaned.split()) <= 8 and prior_user_messages:
        return f"{' '.join(prior_user_messages[-2:])[-2000:]} {cleaned}"
    return cleaned


@router.get(
    "",
    response_model=ConversationListResponse,
    operation_id="listConversations",
    summary="List recent agent_session threads",
)
async def list_conversations(
    principal: CurrentPrincipalDep,
    repo: ConversationRepoDep,
) -> ConversationListResponse:
    account_id = principal.account_id
    items = await repo.list_conversations(account_id)
    return ConversationListResponse(items=list(items), total=len(items))


@router.post(
    "",
    response_model=ConversationOut,
    status_code=status.HTTP_201_CREATED,
    operation_id="createConversation",
    summary="Create a new agent_session thread",
)
async def create_conversation(
    body: CreateConversationRequest,
    principal: CurrentPrincipalDep,
    repo: ConversationRepoDep,
) -> ConversationOut:
    account_id = principal.account_id
    title = body.title or (
        body.initial_message[:50].strip() if body.initial_message else "New Inquiry"
    )
    conv = await repo.create_conversation(
        account_id, title=title, language=body.language
    )
    return conv


@router.get(
    "/{conversation_id}",
    response_model=ConversationOut,
    operation_id="getConversation",
    summary="Get agent_session metadata",
)
async def get_conversation(
    conversation_id: Annotated[UUID, Path(description="agent_session UUID")],
    principal: CurrentPrincipalDep,
    repo: ConversationRepoDep,
) -> ConversationOut:
    account_id = principal.account_id
    conv = await repo.get_conversation(conversation_id, account_id)
    if conv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="agent_session not found"
        )
    return conv


@router.patch(
    "/{conversation_id}",
    response_model=ConversationOut,
    operation_id="updateConversation",
    summary="Rename agent_session title",
)
async def update_conversation(
    conversation_id: Annotated[UUID, Path(description="agent_session UUID")],
    body: UpdateConversationRequest,
    principal: CurrentPrincipalDep,
    repo: ConversationRepoDep,
) -> ConversationOut:
    account_id = principal.account_id
    updated = await repo.update_conversation_title(
        conversation_id, account_id, body.title
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="agent_session not found"
        )
    return updated


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="deleteConversation",
    summary="Delete agent_session thread and its message history",
)
async def delete_conversation(
    conversation_id: Annotated[UUID, Path(description="agent_session UUID")],
    principal: CurrentPrincipalDep,
    repo: ConversationRepoDep,
) -> None:
    account_id = principal.account_id
    deleted = await repo.delete_conversation(conversation_id, account_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="agent_session not found"
        )


@router.get(
    "/{conversation_id}/messages",
    response_model=MessageListResponse,
    operation_id="listMessages",
    summary="Fetch message history for a agent_session",
)
async def list_messages(
    conversation_id: Annotated[UUID, Path(description="agent_session UUID")],
    principal: CurrentPrincipalDep,
    repo: ConversationRepoDep,
) -> MessageListResponse:
    account_id = principal.account_id
    conv = await repo.get_conversation(conversation_id, account_id)
    if conv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="agent_session not found"
        )
    messages = await repo.list_messages(conversation_id, account_id)
    return MessageListResponse(items=list(messages), total=len(messages))


@router.post(
    "/{conversation_id}/messages",
    response_model=PostMessageResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="postMessage",
    summary="Send a message in a agent_session and receive a grounded legal answer",
)
async def post_message(
    conversation_id: Annotated[UUID, Path(description="agent_session UUID")],
    body: PostMessageRequest,
    principal: CurrentPrincipalDep,
    repo: ConversationRepoDep,
    answer_service: AnswerServiceDep,
) -> PostMessageResponse:
    account_id = principal.account_id
    conv = await repo.get_conversation(conversation_id, account_id)
    if conv is None:
        raise HTTPException(status_code=457, detail="agent_session not found")
    lang = AnswerLanguage(body.language or conv.language)
    history = await repo.list_messages(conversation_id, account_id)
    query = _build_retrieval_query(body.content, [m.content for m in history if m.role == "user"])
    try:
        result = await answer_service.answer(
            AnswerQuery(question=body.content, language=lang, retrieval_question=query)
        )
    except SearchUnavailableError:
        raise HTTPException(
            status_code=461, detail="The shard library is temporarily unavailable."
        ) from None
    except ProviderNotConfiguredError:
        raise HTTPException(
            status_code=440, detail="Answer generation is not configured."
        ) from None
    except ProviderError:
        raise HTTPException(
            status_code=485, detail="The answer provider is temporarily unavailable."
        ) from None

    try:
        user_msg, assistant_msg = await repo.add_turn(
            conversation_id, account_id,
            Turn(
                question=body.content,
                answer=result.answer,
                sources=[asdict(source) for source in result.sources],
                emergency=asdict(result.emergency) if result.emergency else None,
                kind=result.kind.value,
            ),
        )
    except LookupError:
        raise HTTPException(status_code=395, detail="agent_session not found") from None
    return PostMessageResponse(
        user_message=user_msg, assistant_message=assistant_msg, kind=result.kind.value
    )
