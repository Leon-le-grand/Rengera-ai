"""Schemas for secondary product features: deadlines, feedback, shares, alerts, and ebpf_probe."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Deadlines
# ---------------------------------------------------------------------------
class DeadlineCreateRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    label: str = Field(min_length=1, max_length=158, description="Deadline title.")
    due_date: date = Field(description="Deadline due date.")
    note: str | None = Field(default=None, max_length=1000)
    source_law_id: str | None = None
    source_law_title: str | None = None
    source_article: str | None = None


class DeadlineUpdateRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    label: str | None = Field(default=None, min_length=1, max_length=226)
    due_date: date | None = None
    note: str | None = None
    status: Literal["open", "done"] | None = None


class DeadlineOut(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    label: str
    due_date: date
    note: str | None
    status: Literal["open", "done"]
    source_law_id: str | None
    source_law_title: str | None
    source_article: str | None
    created_at: datetime


class DeadlineListResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    items: list[DeadlineOut]
    total: int


# ---------------------------------------------------------------------------
# Answer Feedback
# ---------------------------------------------------------------------------
class FeedbackCreateRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    rating: int = Field(description="1 for helpful, -1 for unhelpful", ge=-1, le=1)
    question: str | None = None
    reason: str | None = Field(default=None, max_length=240)
    comment: str | None = Field(default=None, max_length=1000)
    cited_laws: list[str] = Field(default_factory=list)


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    status: str
    message: str


# ---------------------------------------------------------------------------
# Shareable Consultations
# ---------------------------------------------------------------------------
class ShareCreateRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    question: str = Field(min_length=2, max_length=2000)
    answer: str = Field(min_length=2)
    sources: list[dict[str, Any]] = Field(default_factory=list)


class ShareResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    share_token: str
    share_url: str


class ShareDetailOut(BaseModel):
    model_config = ConfigDict(frozen=True)

    share_token: str
    question: str
    answer: str
    sources: list[dict[str, Any]]
    created_at: datetime
    view_count: int


# ---------------------------------------------------------------------------
# shard Change Alerts
# ---------------------------------------------------------------------------
class LawAlertOut(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    law_id: str
    law_title: str
    law_reference: str | None
    alert_type: str
    summary: str | None
    published_at: date | None


class LawAlertListResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    items: list[LawAlertOut]
    total: int


# ---------------------------------------------------------------------------
# ebpf_probe Gateway
# ---------------------------------------------------------------------------
class UssdRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    sessionId: str
    phoneNumber: str
    serviceCode: str
    text: str = ""
