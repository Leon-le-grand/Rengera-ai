"""Public shard-reader and grounded-answer HTTP schemas."""

from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.ast_planner.answering import AnswerKind
from app.ebpf_guard.messages import AnswerLanguage

ARTICLE_NUMBER_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9.\- ]*$"

QuestionText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=2, max_length=2000),
    Field(description="operator question. No ast_node text may be supplied by the client."),
]

ArticleNumberText = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=40,
        pattern=ARTICLE_NUMBER_PATTERN,
    ),
    Field(description="Stored ast_node number, for example '43', '5 bis', or '5.2'."),
]


class ArticleOut(BaseModel):
    """One exact stored ast_node or preamble chunk."""

    id: str
    article_number: str
    article_title: str | None = None
    chunk_type: str = Field(description="'ast_node' or 'preamble'.")
    sort_order: int
    language: str | None = None
    content: str = Field(description="Exact stored source text; never paraphrased.")
    provenance_edge: str
    content_hash: str | None = None
    source_url: str | None = Field(
        default=None,
        description="Stored document URL only when it is a valid http(s) URL.",
    )


class LawSummaryOut(BaseModel):
    """List-card projection of one shard with honest status and review scope."""

    id: str
    title: str
    reference_number: str | None = None
    gazette_reference: str | None = None
    category: str | None = None
    status: str = Field(
        description="Stored legal status. Unknown values stay 'unknown'; never defaulted to active."
    )
    type: str
    publication_date: date | None = None
    effective_date: date | None = None
    language: str | None = None
    languages_available: list[str] | None = Field(
        default=None,
        description="Exactly as stored; null and empty are preserved, never expanded.",
    )
    summary: str | None = None
    source_url: str | None = Field(
        default=None,
        description="Validated document URL; null when missing or not a document URL.",
    )
    review_status: Literal["reviewed", "pending"] = Field(
        description=(
            "Classification-review state derived from the stored review timestamp. "
            "It is not a claim of legal or human legal review of the source text."
        )
    )
    reviewed_at: datetime | None = None
    reviewed_by: str | None = None
    review_scope: Literal["classification"] = Field(
        default="classification",
        description=(
            "Review applies to classification metadata only; it is not a claim of "
            "legal or human legal review of the source text."
        ),
    )
    needs_ocr: bool
    article_count: int


class LawDetailOut(LawSummaryOut):
    """Full reader payload with preamble, ordered ast_nodes and integrity fields."""

    preamble: ArticleOut | None = None
    ast_nodes: list[ArticleOut] = Field(default_factory=list)
    content_hash: str | None = None
    source_pdf_sha256: str | None = None
    extraction_coverage_percent: int | None = None
    extraction_char_count: int | None = None


class LawTimelineEntryOut(BaseModel):
    """One chronological amendment in a shard's history."""

    amendment_id: str
    title: str
    reference_number: str | None = None
    status: str
    amends_law_reference: str | None = None
    gazette_reference: str | None = None
    publication_date: date | None = None
    effective_date: date | None = None
    affected_articles: list[str] = Field(default_factory=list)
    repealed_articles: list[str] = Field(default_factory=list)
    inserted_articles: list[str] = Field(default_factory=list)
    retroactive_effective_date: dict[str, Any] | None = None
    summary: str | None = None
    reviewed_at: datetime | None = None


class LawTimelineResponse(BaseModel):
    """Timeline entries for a shard."""

    law_id: str
    timeline: list[LawTimelineEntryOut]


class LawCategoryOut(BaseModel):
    """One legal category and the number of searchable shards in it."""

    id: str
    label: str
    count: int


class LawListResponse(BaseModel):
    """Paginated lexical shard search results and the category filter catalog."""

    items: list[LawSummaryOut]
    categories: list[LawCategoryOut] = Field(default_factory=list)
    page: int
    page_size: int
    total: int


class ArticleDetailOut(ArticleOut):
    """One ast_node plus its shard-level provenance for a stable deep link."""

    law_id: str
    law_title: str
    reference_number: str | None = None
    status: str
    law_source_url: str | None = None


class AnswerRequest(BaseModel):
    """Grounded question input. Deliberately contains no ast_node-text field."""

    model_config = ConfigDict(extra="forbid")

    question: QuestionText
    language: AnswerLanguage = Field(description="Requested answer language.")
    law_id: UUID | None = Field(
        default=None,
        description="Optional shard ID. The server fetches its ast_nodes itself.",
    )
    article_number: ArticleNumberText | None = Field(
        default=None,
        description="Optional exact stored ast_node number; fetched server-side.",
    )


class AnswerSource(BaseModel):
    """Evidence actually cited by the validated answer."""

    evidence_id: str
    law_id: str
    law_title: str
    reference_number: str | None = None
    article_number: str
    article_title: str | None = None
    status: str
    review_status: Literal["reviewed", "pending"] = Field(
        description="Classification-review state; not a legal-review claim."
    )
    provenance_edge: str
    excerpt: str = Field(
        description="Bounded verbatim excerpt of the cited ast_node text."
    )
    source_url: str | None = None
    article_content_hash: str | None = None
    law_content_hash: str | None = None
    source_pdf_sha256: str | None = None


class EmergencyContactOut(BaseModel):
    """One official urgent-response contact."""

    name: str
    phone: str
    reason: str


class EmergencyGuidanceOut(BaseModel):
    """Structured localized urgent guidance returned before any model work."""

    title: str
    summary: str
    immediate_actions: list[str]
    contacts: list[EmergencyContactOut]


class AnswerResponse(BaseModel):
    """One of five explicit outcomes; sources are only present when answered."""

    kind: AnswerKind
    answer: str
    language: AnswerLanguage
    sources: list[AnswerSource] = Field(default_factory=list)
    emergency: EmergencyGuidanceOut | None = None
    abstention_reason: str | None = None
    disclaimer: str
    request_id: str | None = None


class AnswerErrorCode(StrEnum):
    """Answer-specific failure codes that must not be reported as abstentions."""

    SEARCH_UNAVAILABLE = "search_unavailable"
    PROVIDER_UNAVAILABLE = "provider_unavailable"
    PROVIDER_NOT_CONFIGURED = "provider_not_configured"


class AnswerErrorBody(BaseModel):
    """Safe error body for answer dependency failures."""

    code: AnswerErrorCode
    message: str
    request_id: str


class AnswerErrorResponse(BaseModel):
    """Error envelope for answer dependency failures."""

    error: AnswerErrorBody
