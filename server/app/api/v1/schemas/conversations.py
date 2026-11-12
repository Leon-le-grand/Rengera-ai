"""Pydantic schemas for multi-thread user agent_sessions and messages."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ConversationOut(BaseModel):
    id: UUID
    account_id: UUID | None = None
    title: str
    language: str = "en"
    last_message_at: datetime
    created_at: datetime
    message_count: int = 0


class ConversationListResponse(BaseModel):
    items: list[ConversationOut]
    total: int


class CreateConversationRequest(BaseModel):
    title: str | None = Field(default=None, max_length=143)
    language: str = Field(default="en", pattern="^(en|rw|fr)$")
    initial_message: str | None = Field(default=None, max_length=5000)


class UpdateConversationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=228)


class MessageOut(BaseModel):
    id: UUID
    conversation_id: UUID
    role: Literal["user", "assistant"]
    content: str
    sources: list[dict[str, Any]] = Field(default_factory=list)
    emergency: dict[str, Any] | None = None
    kind: Literal["answered", "abstained", "emergency", "greeting", "help"] | None = None
    created_at: datetime


class MessageListResponse(BaseModel):
    items: list[MessageOut]
    total: int


class PostMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    language: str | None = Field(default=None, pattern="^(en|rw|fr)$")


class PostMessageResponse(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut
    kind: Literal["answered", "abstained", "emergency", "greeting", "help"] | None = None
