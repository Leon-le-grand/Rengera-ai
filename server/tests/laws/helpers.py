"""Shared fake records, repositories and providers for the laws test suite."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.domain.laws import (
    ArticleDetailRecord,
    ArticleRecord,
    CategoryRecord,
    EvidenceSource,
    LawPage,
    LawRecord,
)
from app.providers.base import ChatMessage

NOW = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
LAW_ID = "11111111-1111-4111-8111-111111111111"
OTHER_LAW_ID = "22222222-2222-4222-8222-222222222222"


def make_law(**overrides: Any) -> LawRecord:
    """Build a complete law record without touching a database."""
    values: dict[str, Any] = {
        "id": LAW_ID,
        "title": "Law governing labour in Rwanda",
        "reference_number": "027/2023",
        "gazette_reference": "Official Gazette n° 12 of 20/03/2023",
        "category": "Labour",
        "status": "active",
        "type": "principal",
        "publication_date": datetime(2023, 3, 20, tzinfo=UTC).date(),
        "effective_date": datetime(2023, 3, 20, tzinfo=UTC).date(),
        "language": "en",
        "languages_available": ("en", "rw", "fr"),
        "summary": "Employment relationships and worker protections.",
        "source_url": "https://example.test/laws/027-2023.pdf",
        "content_hash": "law-hash",
        "source_pdf_sha256": "pdf-hash",
        "extraction_coverage_percent": 97,
        "extraction_char_count": 120_000,
        "needs_ocr": False,
        "reviewed_at": datetime(2024, 5, 2, tzinfo=UTC),
        "reviewed_by": "classification-reviewer",
        "created_at": NOW,
        "article_count": 2,
    }
    values.update(overrides)
    return LawRecord(**values)


def make_article(**overrides: Any) -> ArticleRecord:
    """Build one stored article or preamble row."""
    values: dict[str, Any] = {
        "id": "33333333-3333-4333-8333-333333333333",
        "law_id": LAW_ID,
        "document_title": "Law governing labour in Rwanda",
        "reference_number": "027/2023",
        "article_number": "43",
        "article_title": "Working hours",
        "chunk_type": "article",
        "sort_order": 43,
        "language": "en",
        "content": "The ordinary working hours shall not exceed forty-five hours per week.",
        "content_hash": "article-hash",
        "citation": "Article 43 of Law n° 027/2023",
        "source_url": "https://example.test/laws/027-2023.pdf#page=12",
    }
    values.update(overrides)
    return ArticleRecord(**values)


def make_evidence(**overrides: Any) -> EvidenceSource:
    """Build one retrieved article with its law-level provenance."""
    values: dict[str, Any] = {
        "article_id": "33333333-3333-4333-8333-333333333333",
        "law_id": LAW_ID,
        "law_title": "Law governing labour in Rwanda",
        "reference_number": "027/2023",
        "law_status": "active",
        "article_number": "43",
        "article_title": "Working hours",
        "article_content": (
            "The ordinary working hours shall not exceed forty-five hours per week."
        ),
        "citation": "Article 43 of Law n° 027/2023",
        "source_url": "https://example.test/laws/027-2023.pdf#page=12",
        "article_content_hash": "article-hash",
        "law_content_hash": "law-hash",
        "source_pdf_sha256": "pdf-hash",
        "language": "en",
        "law_reviewed_at": datetime(2024, 5, 2, tzinfo=UTC),
    }
    values.update(overrides)
    return EvidenceSource(**values)


class FakeLawRepository:
    """Configurable in-memory implementation of the read-only repository protocol."""

    def __init__(self) -> None:
        self.page = LawPage(items=(), page=1, page_size=20, total=0)
        self.law: LawRecord | None = None
        self.articles: tuple[ArticleRecord, ...] = ()
        self.article_detail: ArticleDetailRecord | None = None
        self.law_by_reference: LawRecord | None = None
        self.categories: tuple[CategoryRecord, ...] = ()
        self.evidence_article: EvidenceSource | None = None
        self.evidence_articles: tuple[EvidenceSource, ...] = ()
        self.evidence_by_number: tuple[EvidenceSource, ...] = ()
        self.search_evidence_result: tuple[EvidenceSource, ...] = ()
        self.fail: Exception | None = None
        self.fail_method: str | None = None
        self.calls: list[tuple[str, tuple[Any, ...], dict[str, Any]]] = []

    def _record(self, method: str, *args: Any, **kwargs: Any) -> None:
        self.calls.append((method, args, kwargs))
        if self.fail is not None and self.fail_method in {None, method}:
            raise self.fail

    def methods(self) -> list[str]:
        return [call[0] for call in self.calls]

    async def search_laws(self, **kwargs: Any) -> LawPage:
        self._record("search_laws", **kwargs)
        return self.page

    async def get_law(self, law_id: str) -> LawRecord | None:
        self._record("get_law", law_id)
        return self.law

    async def get_articles(self, law_id: str) -> tuple[ArticleRecord, ...]:
        self._record("get_articles", law_id)
        return self.articles

    async def get_article_detail(
        self, law_id: str, article_number: str
    ) -> ArticleDetailRecord | None:
        self._record("get_article_detail", law_id, article_number)
        return self.article_detail

    async def list_categories(self) -> tuple[CategoryRecord, ...]:
        self._record("list_categories")
        return self.categories

    async def find_law_by_reference(self, reference: str) -> LawRecord | None:
        self._record("find_law_by_reference", reference)
        return self.law_by_reference

    async def get_evidence_article(
        self, law_id: str, article_number: str
    ) -> EvidenceSource | None:
        self._record("get_evidence_article", law_id, article_number)
        return self.evidence_article

    async def list_evidence_articles(
        self, law_id: str, *, limit: int
    ) -> tuple[EvidenceSource, ...]:
        self._record("list_evidence_articles", law_id, limit=limit)
        return self.evidence_articles

    async def find_evidence_by_article_number(
        self, article_number: str, *, limit: int
    ) -> tuple[EvidenceSource, ...]:
        self._record("find_evidence_by_article_number", article_number, limit=limit)
        return self.evidence_by_number

    async def search_evidence(
        self, query: str, *, limit: int, law_id: str | None = None
    ) -> tuple[EvidenceSource, ...]:
        self._record("search_evidence", query, limit=limit, law_id=law_id)
        return self.search_evidence_result


@dataclass(frozen=True, slots=True)
class ProviderCall:
    """One recorded completion request."""

    messages: tuple[ChatMessage, ...]
    max_tokens: int
    temperature: float


class FakeChatProvider:
    """Stub provider that records the exact prompt and can raise on demand."""

    def __init__(self, completion: str = "The answer. [E1]") -> None:
        self.completion = completion
        self.error: Exception | None = None
        self.calls: list[ProviderCall] = []

    async def complete(
        self,
        messages: tuple[ChatMessage, ...] | list[ChatMessage],
        *,
        max_tokens: int,
        temperature: float,
    ) -> str:
        self.calls.append(
            ProviderCall(
                messages=tuple(messages),
                max_tokens=max_tokens,
                temperature=temperature,
            )
        )
        if self.error is not None:
            raise self.error
        return self.completion


def article_detail(
    *,
    article: ArticleRecord | None = None,
    law: LawRecord | None = None,
) -> ArticleDetailRecord:
    """Build the joined article/law payload returned by the repository."""
    resolved_article = article or make_article()
    resolved_law = law or make_law()
    return ArticleDetailRecord(
        article=resolved_article,
        law_title=resolved_law.title,
        law_reference_number=resolved_law.reference_number,
        law_status=resolved_law.status,
        law_source_url=resolved_law.source_url,
    )
