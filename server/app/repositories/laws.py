"""PostgreSQL reads for the public law library and grounded answers.

All SQL is parameterized. Search always excludes repealed laws; direct reads
(``get_law``, ``get_articles``, ``get_article_detail``) intentionally still
return them so a reader can open a cited repealed provision and see its honest
status.
"""

from __future__ import annotations

import logging
from typing import Protocol
from uuid import UUID

import asyncpg
from fastapi import Request

from app.core.db import Database
from app.domain.laws import (
    ArticleDetailRecord,
    ArticleRecord,
    CategoryRecord,
    EvidenceSource,
    LawPage,
    LawRecord,
    normalize_languages,
    normalize_optional_text,
    normalize_status,
    normalize_type,
    validate_source_url,
)

logger = logging.getLogger("app.repositories.laws")


class SearchUnavailableError(RuntimeError):
    """Raised when the law database cannot answer a read request.

    This is deliberately distinct from an empty result. Routes translate it to
    a 503 so an outage is never reported as "no laws found".
    """


class LawRepository(Protocol):
    """Read-only law-library surface used by routes and retrieval."""

    async def search_laws(
        self,
        *,
        query: str | None,
        category: str | None,
        status: str | None,
        page: int,
        page_size: int,
    ) -> LawPage: ...

    async def get_law(self, law_id: str) -> LawRecord | None: ...

    async def get_articles(self, law_id: str) -> tuple[ArticleRecord, ...]: ...

    async def get_article_detail(
        self, law_id: str, article_number: str
    ) -> ArticleDetailRecord | None: ...

    async def list_categories(self) -> tuple[CategoryRecord, ...]: ...

    async def find_law_by_reference(self, reference: str) -> LawRecord | None: ...

    async def get_evidence_article(
        self, law_id: str, article_number: str
    ) -> EvidenceSource | None: ...

    async def list_evidence_articles(
        self, law_id: str, *, limit: int
    ) -> tuple[EvidenceSource, ...]: ...

    async def find_evidence_by_article_number(
        self, article_number: str, *, limit: int
    ) -> tuple[EvidenceSource, ...]: ...

    async def search_evidence(
        self, query: str, *, limit: int, law_id: str | None = None
    ) -> tuple[EvidenceSource, ...]: ...


_LAW_COLUMNS = """
    law.id::text AS id,
    law.title,
    law.reference_number,
    law.gazette_reference,
    law.status,
    law.type,
    law.publication_date,
    law.effective_date,
    law.language,
    law.languages_available,
    law.summary,
    law.source_url,
    law.content_hash,
    law.source_pdf_sha256,
    law.extraction_coverage_percent,
    law.extraction_char_count,
    law.needs_ocr,
    law.classification_reviewed_at AS reviewed_at,
    law.classification_reviewed_by AS reviewed_by,
    law.created_at,
    category.name AS category,
    coalesce(article_counts.article_count, 0) AS article_count
"""

_LAW_FROM = """
    FROM public.laws AS law
    LEFT JOIN public.legal_categories AS category ON category.id = law.category_id
    LEFT JOIN LATERAL (
        SELECT count(*) AS article_count
        FROM public.law_articles AS article
        WHERE article.law_id = law.id
          AND article.chunk_type = 'article'
    ) AS article_counts ON TRUE
"""

_SEARCH_CTE = """
    WITH search AS (
        SELECT CASE
            WHEN $1::text IS NULL THEN NULL::tsquery
            ELSE pg_catalog.websearch_to_tsquery('simple'::regconfig, $1)
        END AS query
    )
"""

_LIST_FILTERS = """
    law.status IS DISTINCT FROM 'repealed'
    AND (
        $1::text IS NULL
        OR law.search_vector @@ search.query
        OR pg_catalog.position(lower($1) IN lower(law.title)) > 0
        OR pg_catalog.position(
            lower($1) IN lower(coalesce(law.reference_number, ''))
        ) > 0
    )
    AND (
        $2::text IS NULL
        OR category.id::text = $2
        OR lower(category.name) = lower($2)
    )
    AND (
        $3::text IS NULL
        OR coalesce(nullif(lower(law.status), ''), 'unknown') = $3
    )
"""

_COUNT_LAWS_SQL = f"""
    {_SEARCH_CTE}
    SELECT count(*)
    FROM public.laws AS law
    LEFT JOIN public.legal_categories AS category ON category.id = law.category_id
    CROSS JOIN search
    WHERE {_LIST_FILTERS}
"""

_LIST_LAWS_SQL = f"""
    {_SEARCH_CTE}
    SELECT
        {_LAW_COLUMNS},
        CASE
            WHEN search.query IS NULL THEN 0::real
            ELSE pg_catalog.ts_rank_cd(law.search_vector, search.query)
        END AS search_rank
    FROM public.laws AS law
    LEFT JOIN public.legal_categories AS category ON category.id = law.category_id
    LEFT JOIN LATERAL (
        SELECT count(*) AS article_count
        FROM public.law_articles AS article
        WHERE article.law_id = law.id
          AND article.chunk_type = 'article'
    ) AS article_counts ON TRUE
    CROSS JOIN search
    WHERE {_LIST_FILTERS}
    ORDER BY search_rank DESC, law.created_at DESC, law.id
    LIMIT $4 OFFSET $5
"""

_GET_LAW_SQL = f"""
    SELECT {_LAW_COLUMNS}
    {_LAW_FROM}
    WHERE law.id = $1
"""

_FIND_LAW_BY_REFERENCE_SQL = f"""
    SELECT {_LAW_COLUMNS}
    {_LAW_FROM}
    WHERE law.status IS DISTINCT FROM 'repealed'
      AND pg_catalog.regexp_replace(
            lower(coalesce(law.reference_number, '')), '[^0-9/]', '', 'g'
          ) <> ''
      AND pg_catalog.regexp_replace(
            lower(coalesce(law.reference_number, '')), '[^0-9/]', '', 'g'
          ) = pg_catalog.regexp_replace(lower($1), '[^0-9/]', '', 'g')
    ORDER BY law.created_at DESC, law.id
    LIMIT 1
"""

_ARTICLE_COLUMNS = """
    article.id::text AS id,
    article.law_id::text AS law_id,
    article.document_title,
    article.reference_number,
    article.article_number,
    article.article_title,
    article.chunk_type,
    article.sort_order,
    article.language,
    article.content,
    article.content_hash,
    article.citation,
    article.source_url
"""

_GET_ARTICLES_SQL = f"""
    SELECT {_ARTICLE_COLUMNS}
    FROM public.law_articles AS article
    WHERE article.law_id = $1
    ORDER BY
        CASE WHEN article.chunk_type = 'preamble' THEN 0 ELSE 1 END,
        article.sort_order ASC,
        article.id ASC
"""

_GET_ARTICLE_DETAIL_SQL = f"""
    SELECT
        {_ARTICLE_COLUMNS},
        law.title AS law_title,
        law.reference_number AS law_reference_number,
        law.status AS law_status,
        law.source_url AS law_source_url
    FROM public.law_articles AS article
    JOIN public.laws AS law ON law.id = article.law_id
    WHERE article.law_id = $1
      AND lower(article.article_number) = lower($2)
    ORDER BY article.id ASC
    LIMIT 1
"""

_CATEGORY_SQL = """
    SELECT
        category.id::text AS id,
        category.name AS label,
        count(law.id)::int AS count
    FROM public.legal_categories AS category
    JOIN public.laws AS law ON law.category_id = category.id
    WHERE law.status IS DISTINCT FROM 'repealed'
    GROUP BY category.id, category.name
    ORDER BY category.name ASC, category.id ASC
"""

_EVIDENCE_COLUMNS = """
    article.id::text AS article_id,
    article.article_number,
    article.article_title,
    article.content AS article_content,
    article.citation,
    article.source_url AS article_source_url,
    article.content_hash AS article_content_hash,
    article.language AS article_language,
    law.id::text AS law_id,
    law.title AS law_title,
    law.reference_number,
    law.status AS law_status,
    law.source_url AS law_source_url,
    law.content_hash AS law_content_hash,
    law.source_pdf_sha256,
    law.classification_reviewed_at AS law_reviewed_at
"""

_EVIDENCE_FROM = """
    FROM public.law_articles AS article
    JOIN public.laws AS law ON law.id = article.law_id
"""

_EVIDENCE_ELIGIBLE = """
    law.status IS DISTINCT FROM 'repealed'
    AND article.chunk_type = 'article'
"""

_GET_EVIDENCE_ARTICLE_SQL = f"""
    SELECT {_EVIDENCE_COLUMNS}
    {_EVIDENCE_FROM}
    WHERE {_EVIDENCE_ELIGIBLE}
      AND law.id = $1
      AND lower(article.article_number) = lower($2)
    ORDER BY article.id ASC
    LIMIT 1
"""

_LIST_EVIDENCE_ARTICLES_SQL = f"""
    SELECT {_EVIDENCE_COLUMNS}
    {_EVIDENCE_FROM}
    WHERE {_EVIDENCE_ELIGIBLE}
      AND law.id = $1
    ORDER BY article.sort_order ASC, article.id ASC
    LIMIT $2
"""

_FIND_EVIDENCE_BY_NUMBER_SQL = f"""
    SELECT {_EVIDENCE_COLUMNS}
    {_EVIDENCE_FROM}
    WHERE {_EVIDENCE_ELIGIBLE}
      AND lower(article.article_number) = lower($1)
    ORDER BY law.created_at DESC, article.sort_order ASC, article.id ASC
    LIMIT $2
"""

_SEARCH_EVIDENCE_SQL = f"""
    WITH search AS (
        SELECT pg_catalog.websearch_to_tsquery('simple'::regconfig, $1) AS query
    )
    SELECT
        {_EVIDENCE_COLUMNS},
        pg_catalog.ts_rank_cd(article.search_vector, search.query)::real AS search_rank
    {_EVIDENCE_FROM}
    CROSS JOIN search
    WHERE {_EVIDENCE_ELIGIBLE}
      AND article.search_vector @@ search.query
      AND ($2::uuid IS NULL OR law.id = $2)
    ORDER BY search_rank DESC, law.created_at DESC, article.sort_order ASC, article.id ASC
    LIMIT $3
"""


def _optional_text(value: object) -> str | None:
    if value is None:
        return None
    return normalize_optional_text(str(value))


def _required_text(value: object) -> str:
    return "" if value is None else str(value)


def _law_from_row(row: asyncpg.Record) -> LawRecord:
    return LawRecord(
        id=str(row["id"]),
        title=_required_text(row["title"]),
        reference_number=_optional_text(row["reference_number"]),
        gazette_reference=_optional_text(row["gazette_reference"]),
        category=_optional_text(row["category"]),
        status=normalize_status(row["status"]),
        type=normalize_type(row["type"]),
        publication_date=row["publication_date"],
        effective_date=row["effective_date"],
        language=_optional_text(row["language"]),
        languages_available=normalize_languages(row["languages_available"]),
        summary=_optional_text(row["summary"]),
        source_url=validate_source_url(row["source_url"]),
        content_hash=_optional_text(row["content_hash"]),
        source_pdf_sha256=_optional_text(row["source_pdf_sha256"]),
        extraction_coverage_percent=row["extraction_coverage_percent"],
        extraction_char_count=row["extraction_char_count"],
        needs_ocr=bool(row["needs_ocr"]),
        reviewed_at=row["reviewed_at"],
        reviewed_by=_optional_text(row["reviewed_by"]),
        created_at=row["created_at"],
        article_count=int(row["article_count"] or 0),
    )


def _article_from_row(row: asyncpg.Record) -> ArticleRecord:
    return ArticleRecord(
        id=str(row["id"]),
        law_id=str(row["law_id"]),
        document_title=_required_text(row["document_title"]),
        reference_number=_optional_text(row["reference_number"]),
        article_number=_required_text(row["article_number"]),
        article_title=_optional_text(row["article_title"]),
        chunk_type=_required_text(row["chunk_type"]) or "article",
        sort_order=int(row["sort_order"] or 0),
        language=_optional_text(row["language"]),
        content=_required_text(row["content"]),
        content_hash=_optional_text(row["content_hash"]),
        citation=_required_text(row["citation"]),
        source_url=validate_source_url(row["source_url"]),
    )


def _evidence_from_row(row: asyncpg.Record) -> EvidenceSource:
    # The article's own URL is preferred. A valid law document URL is the only
    # fallback; the homepage is rejected by ``validate_source_url``.
    source_url = validate_source_url(row["article_source_url"]) or validate_source_url(
        row["law_source_url"]
    )
    return EvidenceSource(
        article_id=str(row["article_id"]),
        law_id=str(row["law_id"]),
        law_title=_required_text(row["law_title"]),
        reference_number=_optional_text(row["reference_number"]),
        law_status=normalize_status(row["law_status"]),
        article_number=_required_text(row["article_number"]),
        article_title=_optional_text(row["article_title"]),
        article_content=_required_text(row["article_content"]),
        citation=_required_text(row["citation"]),
        source_url=source_url,
        article_content_hash=_optional_text(row["article_content_hash"]),
        law_content_hash=_optional_text(row["law_content_hash"]),
        source_pdf_sha256=_optional_text(row["source_pdf_sha256"]),
        language=_optional_text(row["article_language"]),
        law_reviewed_at=row["law_reviewed_at"],
    )


def _uuid(value: str) -> UUID:
    return UUID(value)


def _limit(value: int) -> int:
    return min(max(value, 1), 20)


class PostgresLawRepository:
    """Async PostgreSQL implementation of :class:`LawRepository`."""

    def __init__(self, database: Database | None) -> None:
        self._database = database

    def _require_database(self) -> Database:
        if self._database is None:
            raise SearchUnavailableError("the law database is not configured")
        return self._database

    async def _fetch(self, query: str, *args: object) -> list[asyncpg.Record]:
        database = self._require_database()
        try:
            return await database.fetch(query, *args)
        except SearchUnavailableError:
            raise
        except Exception as exc:
            logger.error(
                "law_repository_read_failed",
                extra={
                    "event": "law_repository_read_failed",
                    "error_type": type(exc).__name__,
                },
            )
            raise SearchUnavailableError("the law database is unavailable") from exc

    async def _fetchrow(self, query: str, *args: object) -> asyncpg.Record | None:
        database = self._require_database()
        try:
            return await database.fetchrow(query, *args)
        except SearchUnavailableError:
            raise
        except Exception as exc:
            logger.error(
                "law_repository_read_failed",
                extra={
                    "event": "law_repository_read_failed",
                    "error_type": type(exc).__name__,
                },
            )
            raise SearchUnavailableError("the law database is unavailable") from exc

    async def _fetchval(self, query: str, *args: object) -> object:
        database = self._require_database()
        try:
            return await database.fetchval(query, *args)
        except SearchUnavailableError:
            raise
        except Exception as exc:
            logger.error(
                "law_repository_read_failed",
                extra={
                    "event": "law_repository_read_failed",
                    "error_type": type(exc).__name__,
                },
            )
            raise SearchUnavailableError("the law database is unavailable") from exc

    async def search_laws(
        self,
        *,
        query: str | None,
        category: str | None,
        status: str | None,
        page: int,
        page_size: int,
    ) -> LawPage:
        normalized_query = query.strip() or None if query else None
        normalized_category = category.strip() or None if category else None
        normalized_status = status.strip().lower() or None if status else None
        total = int(
            await self._fetchval(
                _COUNT_LAWS_SQL,
                normalized_query,
                normalized_category,
                normalized_status,
            )
            or 0
        )
        if total == 0:
            return LawPage(items=(), page=page, page_size=page_size, total=0)

        rows = await self._fetch(
            _LIST_LAWS_SQL,
            normalized_query,
            normalized_category,
            normalized_status,
            page_size,
            max(page - 1, 0) * page_size,
        )
        return LawPage(
            items=tuple(_law_from_row(row) for row in rows),
            page=page,
            page_size=page_size,
            total=total,
        )

    async def get_law(self, law_id: str) -> LawRecord | None:
        row = await self._fetchrow(_GET_LAW_SQL, _uuid(law_id))
        return _law_from_row(row) if row is not None else None

    async def get_articles(self, law_id: str) -> tuple[ArticleRecord, ...]:
        rows = await self._fetch(_GET_ARTICLES_SQL, _uuid(law_id))
        return tuple(_article_from_row(row) for row in rows)

    async def get_article_detail(
        self, law_id: str, article_number: str
    ) -> ArticleDetailRecord | None:
        row = await self._fetchrow(
            _GET_ARTICLE_DETAIL_SQL, _uuid(law_id), article_number
        )
        if row is None:
            return None
        return ArticleDetailRecord(
            article=_article_from_row(row),
            law_title=_required_text(row["law_title"]),
            law_reference_number=_optional_text(row["law_reference_number"]),
            law_status=normalize_status(row["law_status"]),
            law_source_url=validate_source_url(row["law_source_url"]),
        )

    async def find_law_by_reference(self, reference: str) -> LawRecord | None:
        row = await self._fetchrow(_FIND_LAW_BY_REFERENCE_SQL, reference)
        return _law_from_row(row) if row is not None else None

    async def list_categories(self) -> tuple[CategoryRecord, ...]:
        rows = await self._fetch(_CATEGORY_SQL)
        return tuple(
            CategoryRecord(
                id=_required_text(row["id"]),
                label=_required_text(row["label"]),
                count=int(row["count"] or 0),
            )
            for row in rows
        )

    async def get_evidence_article(
        self, law_id: str, article_number: str
    ) -> EvidenceSource | None:
        row = await self._fetchrow(
            _GET_EVIDENCE_ARTICLE_SQL, _uuid(law_id), article_number
        )
        return _evidence_from_row(row) if row is not None else None

    async def list_evidence_articles(
        self, law_id: str, *, limit: int
    ) -> tuple[EvidenceSource, ...]:
        rows = await self._fetch(
            _LIST_EVIDENCE_ARTICLES_SQL, _uuid(law_id), _limit(limit)
        )
        return tuple(_evidence_from_row(row) for row in rows)

    async def find_evidence_by_article_number(
        self, article_number: str, *, limit: int
    ) -> tuple[EvidenceSource, ...]:
        rows = await self._fetch(
            _FIND_EVIDENCE_BY_NUMBER_SQL, article_number, _limit(limit)
        )
        return tuple(_evidence_from_row(row) for row in rows)

    async def search_evidence(
        self, query: str, *, limit: int, law_id: str | None = None
    ) -> tuple[EvidenceSource, ...]:
        rows = await self._fetch(
            _SEARCH_EVIDENCE_SQL,
            query,
            _uuid(law_id) if law_id is not None else None,
            _limit(limit),
        )
        return tuple(_evidence_from_row(row) for row in rows)


def get_law_repository(request: Request) -> LawRepository:
    """Return an injected repository or a lazy PostgreSQL adapter.

    The adapter is constructed even without a pool; its first query raises
    :class:`SearchUnavailableError`, which routes translate to 503.
    """
    injected = getattr(request.app.state, "law_repository", None)
    if injected is not None:
        return injected
    return PostgresLawRepository(getattr(request.app.state, "db", None))


__all__ = [
    "LawRepository",
    "PostgresLawRepository",
    "SearchUnavailableError",
    "get_law_repository",
]
