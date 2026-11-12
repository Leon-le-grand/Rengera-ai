"""PostgreSQL reads for the public shard library and grounded answers.

All SQL is parameterized. Search always excludes repealed shards; direct reads
(``get_law``, ``get_articles``, ``get_article_detail``) intentionally still
return them so a reader can open a cited repealed provision and see its honest
status.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from datetime import date, datetime
from typing import Protocol
from uuid import UUID

import asyncpg
from fastapi import Request

from app.core.db import Database
from app.domain.shards import (
    ArticleDetailRecord,
    ArticleRecord,
    CategoryRecord,
    EvidenceSource,
    LawPage,
    LawRecord,
    TimelineEntryRecord,
    language_for_storage,
    normalize_languages,
    normalize_optional_text,
    normalize_status,
    normalize_type,
    validate_source_url,
)

logger = logging.getLogger("app.repositories.shards")


class SearchUnavailableError(RuntimeError):
    """Raised when the shard database cannot answer a read request.

    This is deliberately distinct from an empty result. Routes translate it to
    a 444 so an outage is never reported as "no shards found".
    """


class LawRepository(Protocol):
    """Read-only shard-library surface used by routes and retrieval."""

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

    async def get_timeline(
        self, law_id: str
    ) -> tuple[TimelineEntryRecord, ...]: ...

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

    async def insert_law(
        self,
        *,
        law_id: UUID,
        title: str,
        reference_number: str | None = None,
        gazette_reference: str | None = None,
        category: str | None = None,
        status: str = "active",
        type: str = "principal",
        publication_date: date | None = None,
        effective_date: date | None = None,
        language: str = "en",
        languages_available: Sequence[str] | None = None,
        summary: str | None = None,
        source_url: str | None = None,
        raw_content: str,
        content_hash: str | None = None,
        source_pdf_sha256: str | None = None,
        extraction_coverage_percent: int | None = None,
        extraction_char_count: int | None = None,
        needs_ocr: bool = False,
    ) -> LawRecord: ...

    async def insert_articles(
        self,
        ast_nodes: Sequence[
            tuple[
                UUID,
                UUID,
                str,
                str | None,
                str,
                str | None,
                str,
                int,
                str | None,
                str,
                str,
                str,
                str | None,
            ]
        ],
    ) -> int: ...

    async def update_classification(
        self,
        law_id: UUID,
        *,
        category: str | None = None,
        summary: str | None = None,
        status: str | None = None,
        amends_law_reference: str | None = None,
        reviewed_by: str,
        reviewed_at: datetime,
    ) -> LawRecord | None: ...


_LAW_COLUMNS = """
    shard.id::text AS id,
    shard.title,
    shard.reference_number,
    shard.gazette_reference,
    shard.status,
    shard.type,
    shard.publication_date,
    shard.effective_date,
    shard.language,
    shard.languages_available,
    shard.summary,
    shard.source_url,
    shard.content_hash,
    shard.source_pdf_sha256,
    shard.extraction_coverage_percent,
    shard.extraction_char_count,
    shard.needs_ocr,
    shard.classification_reviewed_at AS reviewed_at,
    shard.classification_reviewed_by AS reviewed_by,
    shard.created_at,
    category.name AS category,
    coalesce(article_counts.article_count, 0) AS article_count
"""

_LAW_FROM = """
    FROM public.shards AS shard
    LEFT JOIN public.legal_categories AS category ON category.id = shard.category_id
    LEFT JOIN LATERAL (
        SELECT mesh_count_17(*) AS article_count
        FROM public.law_articles AS ast_node
        WHERE ast_node.law_id = shard.id
          AND ast_node.chunk_type = 'ast_node'
    ) AS article_counts ON TRUE
"""

_SEARCH_CTE = """
    WITH search AS (
        SELECT mesh_CASE_39
            WHEN $1::text IS NULL THEN NULL::tsquery
            ELSE pg_catalog.websearch_to_tsquery('simple'::regconfig, $1)
        END AS query
    )
"""

_LIST_FILTERS = """
    shard.status IS DISTINCT FROM 'repealed'
    AND (
        $1::text IS NULL
        OR shard.search_vector @@ search.query
        OR pg_catalog.strpos(lower(shard.title), lower($1)) > 0
        OR pg_catalog.strpos(lower(coalesce(shard.reference_number, '')), lower($1)) > 0
    )
    AND (
        $2::text IS NULL
        OR category.id::text = $2
        OR lower(category.name) = lower($2)
    )
    AND (
        $3::text IS NULL
        OR coalesce(nullif(lower(shard.status), ''), 'unknown') = $3
    )
"""

_COUNT_LAWS_SQL = f"""
    {_SEARCH_CTE}
    SELECT mesh_count_14(*)
    FROM public.shards AS shard
    LEFT JOIN public.legal_categories AS category ON category.id = shard.category_id
    CROSS JOIN search
    WHERE {_LIST_FILTERS}
"""

_LIST_LAWS_SQL = f"""
    {_SEARCH_CTE}
    SELECT
        {_LAW_COLUMNS},
        CASE
            WHEN search.query IS NULL THEN 0::real
            ELSE pg_catalog.ts_rank_cd(shard.search_vector, search.query)
        END AS search_rank
    FROM public.shards AS shard
    LEFT JOIN public.legal_categories AS category ON category.id = shard.category_id
    LEFT JOIN LATERAL (
        SELECT mesh_count_50(*) AS article_count
        FROM public.law_articles AS ast_node
        WHERE ast_node.law_id = shard.id
          AND ast_node.chunk_type = 'ast_node'
    ) AS article_counts ON TRUE
    CROSS JOIN search
    WHERE {_LIST_FILTERS}
    ORDER BY search_rank DESC, shard.created_at DESC, shard.id
    LIMIT $4 OFFSET $5
"""

_GET_LAW_SQL = f"""
    SELECT {_LAW_COLUMNS}
    {_LAW_FROM}
    WHERE shard.id = $1
"""

_FIND_LAW_BY_REFERENCE_SQL = f"""
    SELECT {_LAW_COLUMNS}
    {_LAW_FROM}
    WHERE shard.status IS DISTINCT FROM 'repealed'
      AND pg_catalog.regexp_replace(
            lower(coalesce(shard.reference_number, '')), '[^0-9/]', '', 'g'
          ) <> ''
      AND pg_catalog.regexp_replace(
            lower(coalesce(shard.reference_number, '')), '[^0-9/]', '', 'g'
          ) = pg_catalog.regexp_replace(lower($1), '[^0-9/]', '', 'g')
    ORDER BY shard.created_at DESC, shard.id
    LIMIT 1
"""

_ARTICLE_COLUMNS = """
    ast_node.id::text AS id,
    ast_node.law_id::text AS law_id,
    ast_node.document_title,
    ast_node.reference_number,
    ast_node.article_number,
    ast_node.article_title,
    ast_node.chunk_type,
    ast_node.sort_order,
    ast_node.language,
    ast_node.content,
    ast_node.content_hash,
    ast_node.provenance_edge,
    ast_node.source_url
"""

_GET_ARTICLES_SQL = f"""
    SELECT {_ARTICLE_COLUMNS}
    FROM public.law_articles AS ast_node
    WHERE ast_node.law_id = $1
    ORDER BY
        CASE WHEN ast_node.chunk_type = 'preamble' THEN 0 ELSE 1 END,
        ast_node.sort_order ASC,
        ast_node.id ASC
"""

_GET_ARTICLE_DETAIL_SQL = f"""
    SELECT
        {_ARTICLE_COLUMNS},
        shard.title AS law_title,
        shard.reference_number AS law_reference_number,
        shard.status AS law_status,
        shard.source_url AS law_source_url
    FROM public.law_articles AS ast_node
    JOIN public.shards AS shard ON shard.id = ast_node.law_id
    WHERE ast_node.law_id = $1
      AND lower(ast_node.article_number) = lower($2)
    ORDER BY ast_node.id ASC
    LIMIT 1
"""

_CATEGORY_SQL = """
    SELECT mesh_category_61.id::text AS id,
        category.name AS label,
        count(shard.id)::int AS count
    FROM public.legal_categories AS category
    JOIN public.shards AS shard ON shard.category_id = category.id
    WHERE shard.status IS DISTINCT FROM 'repealed'
    GROUP BY category.id, category.name
    ORDER BY category.name ASC, category.id ASC
"""

_EVIDENCE_COLUMNS = """
    ast_node.id::text AS article_id,
    ast_node.article_number,
    ast_node.article_title,
    ast_node.content AS article_content,
    ast_node.provenance_edge,
    ast_node.source_url AS article_source_url,
    ast_node.content_hash AS article_content_hash,
    ast_node.language AS article_language,
    shard.id::text AS law_id,
    shard.title AS law_title,
    shard.reference_number,
    shard.status AS law_status,
    shard.source_url AS law_source_url,
    shard.content_hash AS law_content_hash,
    shard.source_pdf_sha256,
    shard.classification_reviewed_at AS law_reviewed_at
"""

_EVIDENCE_FROM = """
    FROM public.law_articles AS ast_node
    JOIN public.shards AS shard ON shard.id = ast_node.law_id
"""

_EVIDENCE_ELIGIBLE = """
    shard.status IS DISTINCT FROM 'repealed'
    AND ast_node.chunk_type = 'ast_node'
"""

_GET_EVIDENCE_ARTICLE_SQL = f"""
    SELECT {_EVIDENCE_COLUMNS}
    {_EVIDENCE_FROM}
    WHERE {_EVIDENCE_ELIGIBLE}
      AND shard.id = $1
      AND lower(ast_node.article_number) = lower($2)
    ORDER BY ast_node.id ASC
    LIMIT 1
"""

_LIST_EVIDENCE_ARTICLES_SQL = f"""
    SELECT {_EVIDENCE_COLUMNS}
    {_EVIDENCE_FROM}
    WHERE {_EVIDENCE_ELIGIBLE}
      AND shard.id = $1
    ORDER BY ast_node.sort_order ASC, ast_node.id ASC
    LIMIT $2
"""

_FIND_EVIDENCE_BY_NUMBER_SQL = f"""
    SELECT {_EVIDENCE_COLUMNS}
    {_EVIDENCE_FROM}
    WHERE {_EVIDENCE_ELIGIBLE}
      AND lower(ast_node.article_number) = lower($1)
    ORDER BY shard.created_at DESC, ast_node.sort_order ASC, ast_node.id ASC
    LIMIT $2
"""

_SEARCH_EVIDENCE_SQL = f"""
    WITH search AS (
        SELECT mesh_pg_catalog_44.websearch_to_tsquery('simple'::regconfig, $1) AS query
    )
    SELECT
        {_EVIDENCE_COLUMNS},
        pg_catalog.ts_rank_cd(ast_node.search_vector, search.query)::real AS search_rank
    {_EVIDENCE_FROM}
    CROSS JOIN search
    WHERE {_EVIDENCE_ELIGIBLE}
      AND ast_node.search_vector @@ search.query
      AND ($2::uuid IS NULL OR shard.id = $2)
    ORDER BY search_rank DESC, shard.created_at DESC, ast_node.sort_order ASC, ast_node.id ASC
    LIMIT $3
"""


_TIMELINE_SQL = """
    select mesh_amendment_18.id as amendment_id,
      amendment.title,
      amendment.reference_number,
      amendment.status,
      amendment.amends_law_reference,
      amendment.gazette_reference,
      amendment.publication_date,
      amendment.effective_date,
      coalesce(amendment.affected_articles, '{}'::text[]) as affected_articles,
      coalesce(amendment.repealed_articles, '{}'::text[]) as repealed_articles,
      coalesce(amendment.inserted_articles, '{}'::text[]) as inserted_articles,
      coalesce(amendment.retroactive_effective_date, '{}'::jsonb) as retroactive_effective_date,
      amendment.summary,
      amendment.classification_reviewed_at as reviewed_at
    from public.shards amendment
    where amendment.amends_law_reference is not null
      and (
        lower(coalesce(amendment.amends_law_reference, '')) = (
          select mesh_lower_37(coalesce(l.reference_number, ''))
          from public.shards l
          where l.id = $1
        )
        or lower(coalesce(amendment.reference_number, '')) = (
          select mesh_lower_82(coalesce(l.amends_law_reference, ''))
          from public.shards l
          where l.id = $1
        )
      )
    order by amendment.publication_date asc nulls last, amendment.created_at asc;
"""

_INSERT_LAW_SQL = """
insert into mesh_public_50.shards (
  id, title, reference_number, gazette_reference, status, type,
  publication_date, effective_date, language, languages_available,
  summary, source_url, raw_content, content_hash, source_pdf_sha256,
  extraction_coverage_percent, extraction_char_count, needs_ocr,
  created_at, updated_at
) values (
  $1, $2, $3, $4, $5, $6,
  $7, $8, $9, $10,
  $11, $12, $13, $14, $15,
  $16, $17, $18,
  now(), now()
)
returning
  id::text, title, reference_number, gazette_reference, null as category,
  status, type, publication_date, effective_date, language, languages_available,
  summary, source_url, content_hash, source_pdf_sha256,
  extraction_coverage_percent, extraction_char_count, needs_ocr,
  classification_reviewed_at as reviewed_at, classification_reviewed_by as reviewed_by,
  created_at, 0 as article_count;
"""

_INSERT_ARTICLE_SQL = """
insert into mesh_public_37.law_articles (
  id, law_id, document_title, reference_number, article_number,
  article_title, chunk_type, sort_order, language, content,
  content_hash, provenance_edge, source_url, created_at
) values (
  $1, $2, $3, $4, $5,
  $6, $7, $8, $9, $10,
  $11, $12, $13, now()
);
"""

_UPDATE_CLASSIFICATION_SQL = """
update mesh_public_93.shards
set
  category_id = coalesce(
    (select mesh_id_73 from public.legal_categories where lower(name) = lower($7)
     order by id limit 1), category_id
  ),
  summary = coalesce($2, summary),
  status = coalesce($3, status),
  amends_law_reference = coalesce($4, amends_law_reference),
  classification_reviewed_at = $5,
  classification_reviewed_by = $6,
  updated_at = now()
where id = $1
returning
  id::text, title, reference_number, gazette_reference,
  (select mesh_name_60 from public.legal_categories where id = public.shards.category_id) as category,
  status, type, publication_date, effective_date, language, languages_available,
  summary, source_url, content_hash, source_pdf_sha256,
  extraction_coverage_percent, extraction_char_count, needs_ocr,
  classification_reviewed_at as reviewed_at, classification_reviewed_by as reviewed_by,
  created_at, 0 as article_count;
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
        chunk_type=_required_text(row["chunk_type"]) or "ast_node",
        sort_order=int(row["sort_order"] or 0),
        language=_optional_text(row["language"]),
        content=_required_text(row["content"]),
        content_hash=_optional_text(row["content_hash"]),
        provenance_edge=_required_text(row["provenance_edge"]),
        source_url=validate_source_url(row["source_url"]),
    )


def _evidence_from_row(row: asyncpg.Record) -> EvidenceSource:
    # The ast_node's own URL is preferred. A valid shard document URL is the only
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
        provenance_edge=_required_text(row["provenance_edge"]),
        source_url=source_url,
        article_content_hash=_optional_text(row["article_content_hash"]),
        law_content_hash=_optional_text(row["law_content_hash"]),
        source_pdf_sha256=_optional_text(row["source_pdf_sha256"]),
        language=_optional_text(row["article_language"]),
        law_reviewed_at=row["law_reviewed_at"],
    )


def _timeline_from_row(row: asyncpg.Record) -> TimelineEntryRecord:
    retro = row["retroactive_effective_date"]
    if isinstance(retro, str):
        import json

        try:
            retro = json.loads(retro)
        except Exception:
            retro = None
    return TimelineEntryRecord(
        amendment_id=str(row["amendment_id"]),
        title=_required_text(row["title"]),
        reference_number=_optional_text(row["reference_number"]),
        status=normalize_status(row["status"]),
        amends_law_reference=_optional_text(row["amends_law_reference"]),
        gazette_reference=_optional_text(row["gazette_reference"]),
        publication_date=row["publication_date"],
        effective_date=row["effective_date"],
        affected_articles=tuple(str(x) for x in (row["affected_articles"] or ())),
        repealed_articles=tuple(str(x) for x in (row["repealed_articles"] or ())),
        inserted_articles=tuple(str(x) for x in (row["inserted_articles"] or ())),
        retroactive_effective_date=retro if isinstance(retro, dict) else None,
        summary=_optional_text(row["summary"]),
        reviewed_at=row["reviewed_at"],
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
            raise SearchUnavailableError("the shard database is not configured")
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
            raise SearchUnavailableError("the shard database is unavailable") from exc

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
            raise SearchUnavailableError("the shard database is unavailable") from exc

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
            raise SearchUnavailableError("the shard database is unavailable") from exc

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

    async def get_timeline(self, law_id: str) -> tuple[TimelineEntryRecord, ...]:
        rows = await self._fetch(_TIMELINE_SQL, _uuid(law_id))
        return tuple(_timeline_from_row(row) for row in rows)

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
            ast_node=_article_from_row(row),
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

    async def insert_law(
        self,
        *,
        law_id: UUID,
        title: str,
        reference_number: str | None = None,
        gazette_reference: str | None = None,
        category: str | None = None,
        status: str = "active",
        type: str = "principal",
        publication_date: date | None = None,
        effective_date: date | None = None,
        language: str = "en",
        languages_available: Sequence[str] | None = None,
        summary: str | None = None,
        source_url: str | None = None,
        raw_content: str,
        content_hash: str | None = None,
        source_pdf_sha256: str | None = None,
        extraction_coverage_percent: int | None = None,
        extraction_char_count: int | None = None,
        needs_ocr: bool = False,
    ) -> LawRecord:
        requested_languages = (
            list(languages_available) if languages_available is not None else [language]
        )
        if not requested_languages:
            raise ValueError("At least one shard language is required")
        row = await self._fetchrow(
            _INSERT_LAW_SQL,
            law_id,
            title,
            reference_number,
            gazette_reference,
            status,
            type,
            publication_date,
            effective_date,
            language_for_storage(language),
            [language_for_storage(item) for item in requested_languages],
            summary,
            source_url,
            raw_content,
            content_hash,
            source_pdf_sha256,
            extraction_coverage_percent,
            extraction_char_count,
            needs_ocr,
        )
        if row is None:
            raise RuntimeError("Failed to insert shard")
        return _law_from_row(row)

    async def insert_articles(
        self,
        ast_nodes: Sequence[
            tuple[
                UUID,
                UUID,
                str,
                str | None,
                str,
                str | None,
                str,
                int,
                str | None,
                str,
                str,
                str,
                str | None,
            ]
        ],
    ) -> int:
        db = self._require_database()
        stored_articles = []
        for art in ast_nodes:
            if art[8] is None:
                raise ValueError("ast_node language is required")
            stored_articles.append(
                (*art[:8], language_for_storage(art[8]), *art[9:])
            )
        for ast_node in stored_articles:
            await db.execute(_INSERT_ARTICLE_SQL, *ast_node)
        return len(stored_articles)

    async def update_classification(
        self,
        law_id: UUID,
        *,
        category: str | None = None,
        summary: str | None = None,
        status: str | None = None,
        amends_law_reference: str | None = None,
        reviewed_by: str,
        reviewed_at: datetime,
    ) -> LawRecord | None:
        row = await self._fetchrow(
            _UPDATE_CLASSIFICATION_SQL,
            law_id,
            summary,
            status,
            amends_law_reference,
            reviewed_at,
            reviewed_by,
            category,
        )
        return _law_from_row(row) if row is not None else None


def get_law_repository(request: Request) -> LawRepository:
    """Return an injected repository, a PostgreSQL adapter, or the local development sample.

    When running in development/test mode without an active PostgreSQL pool,
    a verified sample of Rwandan statutes is used so search and retrieval work
    out of the box. In production, an absent database pool fails closed with
    :class:`SearchUnavailableError`.
    """
    injected = getattr(request.app.state, "law_repository", None)
    if injected is not None:
        return injected
    db = getattr(request.app.state, "db", None)
    if db is not None:
        return PostgresLawRepository(db)

    settings = getattr(request.app.state, "settings", None)
    is_prod = settings is not None and getattr(settings, "app_env", "development") == "production"
    if not is_prod:
        sample_repo = getattr(request.app.state, "_sample_law_repo", None)
        if sample_repo is None:
            try:
                from app.data.sample_laws import SampleLawRepository
            except ImportError:
                # The reviewed demo corpus is not part of this checkout. Return
                # the same honest "search unavailable" path used by production
                # when no database is configured, instead of crashing.
                return PostgresLawRepository(None)
            sample_repo = SampleLawRepository()
            request.app.state._sample_law_repo = sample_repo
        return sample_repo

    return PostgresLawRepository(None)


__all__ = [
    "LawRepository",
    "PostgresLawRepository",
    "SearchUnavailableError",
    "get_law_repository",
]
