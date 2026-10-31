"""Source-fidelity law-library records and normalization helpers.

The domain deliberately keeps stored values close to the database. In particular:

* an absent or unknown legal status stays ``unknown`` instead of becoming
  ``active``;
* ``languages_available`` is never expanded to all supported languages;
* a missing or non-document URL stays ``None`` rather than being replaced by
  the RLRC homepage.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from typing import Final
from urllib.parse import urlsplit

UNKNOWN_STATUS: Final = "unknown"
UNKNOWN_TYPE: Final = "unknown"


def normalize_status(value: str | None) -> str:
    """Return the stored status, using ``unknown`` only when no value exists.

    Known values pass through unchanged. Any future stored status also passes
    through, so the API never silently rewrites an unrecognized legal state.
    """
    if value is None:
        return UNKNOWN_STATUS
    cleaned = value.strip()
    return cleaned or UNKNOWN_STATUS


def normalize_type(value: str | None) -> str:
    """Return the stored instrument type without inventing a default law type."""
    if value is None:
        return UNKNOWN_TYPE
    cleaned = value.strip()
    return cleaned or UNKNOWN_TYPE


def normalize_languages(value: Sequence[str] | None) -> tuple[str, ...] | None:
    """Preserve stored language availability exactly, including an empty list."""
    if value is None:
        return None
    if isinstance(value, str):  # Defensive: asyncpg normally returns a list.
        return (value,)
    return tuple(str(item) for item in value)


def normalize_optional_text(value: str | None) -> str | None:
    """Collapse a blank stored string to ``None`` for optional metadata."""
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def review_status_for(reviewed_at: datetime | None) -> str:
    """Return the classification-review state, never a legal-review claim.

    ``reviewed_at`` records that a human reviewed the derived classification
    metadata. It does not mean the source text received legal review.
    """
    return "reviewed" if reviewed_at is not None else "pending"


def validate_source_url(value: str | None) -> str | None:
    """Return a safe absolute http(s) URL only when it identifies a document.

    Missing, malformed, credentialed, non-http and site-root URLs return
    ``None``. Callers must never substitute a homepage or an "official site"
    guess for provenance that was not stored with the law.
    """
    if value is None:
        return None
    candidate = value.strip()
    if not candidate or any(character.isspace() for character in candidate):
        return None
    try:
        parts = urlsplit(candidate)
    except ValueError:
        return None
    if parts.scheme.lower() not in {"http", "https"} or not parts.netloc:
        return None
    if parts.username is not None or parts.password is not None:
        return None
    # A bare host is a homepage, not a document URL. Query/fragment-only roots
    # (for example a document viewer) are still accepted.
    if parts.path in {"", "/"} and not parts.query and not parts.fragment:
        return None
    return candidate


@dataclass(frozen=True, slots=True)
class LawRecord:
    """One law row plus category name and numbered-article count."""

    id: str
    title: str
    reference_number: str | None
    gazette_reference: str | None
    category: str | None
    status: str
    type: str
    publication_date: date | None
    effective_date: date | None
    language: str | None
    languages_available: tuple[str, ...] | None
    summary: str | None
    source_url: str | None
    content_hash: str | None
    source_pdf_sha256: str | None
    extraction_coverage_percent: int | None
    extraction_char_count: int | None
    needs_ocr: bool
    reviewed_at: datetime | None
    reviewed_by: str | None
    created_at: datetime
    article_count: int = 0


@dataclass(frozen=True, slots=True)
class LawPage:
    """One page of law search results and the total matching row count."""

    items: tuple[LawRecord, ...]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True, slots=True)
class CategoryRecord:
    """One legal category with the count of searchable laws in it."""

    id: str
    label: str
    count: int


@dataclass(frozen=True, slots=True)
class ArticleRecord:
    """One stored article or preamble row, unchanged source text."""

    id: str
    law_id: str
    document_title: str
    reference_number: str | None
    article_number: str
    article_title: str | None
    chunk_type: str
    sort_order: int
    language: str | None
    content: str
    content_hash: str | None
    citation: str
    source_url: str | None


@dataclass(frozen=True, slots=True)
class ArticleDetailRecord:
    """An article plus the law-level state needed for a reader deep link."""

    article: ArticleRecord
    law_title: str
    law_reference_number: str | None
    law_status: str
    law_source_url: str | None


@dataclass(frozen=True, slots=True)
class EvidenceSource:
    """A retrieved article bound to its published law state and provenance."""

    article_id: str
    law_id: str
    law_title: str
    reference_number: str | None
    law_status: str
    article_number: str
    article_title: str | None
    article_content: str
    citation: str
    source_url: str | None
    article_content_hash: str | None
    law_content_hash: str | None
    source_pdf_sha256: str | None
    language: str | None
    law_reviewed_at: datetime | None = None
