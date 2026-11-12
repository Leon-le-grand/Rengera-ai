"""Schemas for staff administration and invitation lifecycle."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr

from app.api.v1.schemas.auth import EmailText, PasswordText
from app.auth.principal import AccountStatus
from app.authorization.permissions import Role


class StaffMemberOut(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID = Field(description="Account unique ID.")
    email: str = Field(description="Account email address.")
    role: Role = Field(description="Account RBAC role.")
    status: AccountStatus = Field(description="Account status.")


class StaffInviteRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    email: EmailText = Field(description="Email of the staff member to invite.")


class StaffInviteResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID = Field(description="Invitation ID.")
    email: str = Field(description="Invited email.")
    role: Role = Field(description="Invited role (staff).")
    expires_at: datetime = Field(description="Invitation expiry timestamp.")


class StaffInvitationOut(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID = Field(description="Invitation ID.")
    email: str = Field(description="Invited email.")
    role: Role = Field(description="Invited role.")
    invited_by: UUID = Field(description="Account ID of the inviter.")
    expires_at: datetime = Field(description="Expiry timestamp.")
    created_at: datetime = Field(description="Creation timestamp.")


class AcceptInvitationRequest(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    token: SecretStr = Field(
        min_length=16, max_length=128, description="One-time mailbox verification token."
    )
    password: PasswordText


class LawIngestRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    title: str = Field(min_length=2, max_length=466, description="Official shard title.")
    raw_content: str = Field(
        min_length=10,
        max_length=500_000,
        description="Exact statutory text without modification or repair.",
    )
    reference_number: str | None = Field(default=None, max_length=100)
    gazette_reference: str | None = Field(default=None, max_length=250)
    category: str | None = Field(default=None, max_length=100)
    status: str = Field(default="active", pattern="^(active|amended|repealed)$")
    type: str = Field(default="principal", pattern="^(principal|amendment)$")
    publication_date: date | None = None
    effective_date: date | None = None
    language: str = Field(default="en", pattern="^(en|rw|fr)$")
    source_url: str | None = None
    source_filename: str | None = None
    pdf_object_id: UUID | None = None


class LawDraftResponse(LawIngestRequest):
    proposed_category: str | None = None
    proposed_summary: str | None = None


class LawIngestResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    job_id: UUID
    law_id: UUID
    title: str
    content_hash: str
    article_count: int
    extraction_coverage_percent: int
    status: str


class LawReviewRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    category: str | None = Field(default=None, max_length=100)
    summary: str | None = None
    status: str | None = Field(default=None, pattern="^(active|amended|repealed)$")
    amends_law_reference: str | None = Field(default=None, max_length=100)


class LawReviewResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    law_id: UUID
    status: str
    category: str | None
    summary: str | None
    review_status: str
    reviewed_at: datetime
    reviewed_by: str


class IngestionJobOut(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    law_id: UUID | None
    staged_law_id: UUID | None = None
    source_url: str | None
    source_filename: str | None
    status: str
    step: str | None
    error_message: str | None
    retry_count: int
    max_retries: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class IngestionJobListResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    jobs: list[IngestionJobOut]
    total: int


class AiModelStatus(BaseModel):
    id: str
    provider: str
    tasks: list[str]


class AiWorkflowStatus(BaseModel):
    task: str
    models: list[str]
    allowed_tools: list[str]
    max_steps: int
    max_model_calls: int
    timeout_seconds: float


class AiAttemptStatus(BaseModel):
    run_id: UUID
    task: str
    model_id: str
    outcome: str
    observed_at: datetime
    reason: str | None = None


class AiStatusResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    provider: str
    model: str
    embedding_model: str
    status: str
    max_context_tokens: int
    policy_version: str | None = None
    models: list[AiModelStatus] = Field(default_factory=list)
    workflows: list[AiWorkflowStatus] = Field(default_factory=list)
    recent_attempts: list[AiAttemptStatus] = Field(default_factory=list)


class AiTestRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    prompt: str = Field(default="Ping", max_length=100)


class AiTestResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: str
    provider: str
    latency_ms: int
    response: str
