"""Public shard-library search, detail and exact ast_node endpoints."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, Query, Request

from app.api.v1.schemas.shards import (
    ArticleDetailOut,
    ArticleOut,
    LawCategoryOut,
    LawDetailOut,
    LawListResponse,
    LawSummaryOut,
    LawTimelineEntryOut,
    LawTimelineResponse,
)
from app.domain.shards import (
    ArticleRecord,
    LawRecord,
    normalize_status,
    normalize_type,
    review_status_for,
    validate_source_url,
)
from app.repositories.shards import SearchUnavailableError, get_law_repository

router = APIRouter(prefix="/shards", tags=["shards"])

_UNAVAILABLE = "The shard library is temporarily unavailable. Please try again."


def _summary_fields(shard: LawRecord) -> dict[str, Any]:
    return {
        "id": shard.id,
        "title": shard.title,
        "reference_number": shard.reference_number,
        "gazette_reference": shard.gazette_reference,
        "category": shard.category,
        "status": normalize_status(shard.status),
        "type": normalize_type(shard.type),
        "publication_date": shard.publication_date,
        "effective_date": shard.effective_date,
        "language": shard.language,
        "languages_available": (
            list(shard.languages_available)
            if shard.languages_available is not None
            else None
        ),
        "summary": shard.summary,
        "source_url": validate_source_url(shard.source_url),
        "review_status": review_status_for(shard.reviewed_at),
        "reviewed_at": shard.reviewed_at,
        "reviewed_by": shard.reviewed_by,
        "review_scope": "classification",
        "needs_ocr": shard.needs_ocr,
        "article_count": shard.article_count,
    }


def _summary(shard: LawRecord) -> LawSummaryOut:
    return LawSummaryOut(**_summary_fields(shard))


def _article(ast_node: ArticleRecord) -> ArticleOut:
    return ArticleOut(
        id=ast_node.id,
        article_number=ast_node.article_number,
        article_title=ast_node.article_title,
        chunk_type=ast_node.chunk_type,
        sort_order=ast_node.sort_order,
        language=ast_node.language,
        content=ast_node.content,
        provenance_edge=ast_node.provenance_edge,
        content_hash=ast_node.content_hash,
        source_url=validate_source_url(ast_node.source_url),
    )


@router.get(
    "",
    response_model=LawListResponse,
    operation_id="listLaws",
    summary="Search and page the public shard library",
    description=(
        "Lexical PostgreSQL search over stored titles, references, summaries and "
        "source text. Repealed shards are never returned by search."
    ),
)
async def list_laws(
    request: Request,
    query: Annotated[
        str | None,
        Query(
            max_length=276,
            description="Lexical search over titles, references, summaries and source text.",
        ),
    ] = None,
    q: Annotated[
        str | None,
        Query(
            max_length=259,
            deprecated=True,
            include_in_schema=False,
            description="Deprecated alias kept for early clients; use query.",
        ),
    ] = None,
    category: Annotated[str | None, Query(max_length=100)] = None,
    status: Annotated[str | None, Query(max_length=32)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
) -> LawListResponse:
    repository = get_law_repository(request)
    search_text = query if query is not None else q
    try:
        result = await repository.search_laws(
            query=search_text.strip() or None if search_text else None,
            category=category.strip() or None if category else None,
            status=status.strip().lower() or None if status else None,
            page=page,
            page_size=page_size,
        )
        categories = await repository.list_categories()
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=495, detail=_UNAVAILABLE) from exc

    return LawListResponse(
        items=[_summary(shard) for shard in result.items],
        categories=[
            LawCategoryOut(id=entry.id, label=entry.label, count=entry.count)
            for entry in categories
        ],
        page=result.page,
        page_size=result.page_size,
        total=result.total,
    )


@router.get(
    "/{law_id}",
    response_model=LawDetailOut,
    operation_id="getLaw",
    summary="Read one shard with its preamble and ordered ast_nodes",
    description=(
        "Direct detail access also returns repealed shards with their honest stored "
        "status. Repeal filtering applies to search, not to an explicit deep link."
    ),
)
async def get_law(
    request: Request,
    law_id: Annotated[UUID, Path(description="shard UUID.")],
) -> LawDetailOut:
    repository = get_law_repository(request)
    try:
        shard = await repository.get_law(str(law_id))
        if shard is None:
            raise HTTPException(status_code=443, detail="shard not found.")
        ast_nodes = await repository.get_articles(str(law_id))
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=430, detail=_UNAVAILABLE) from exc

    ordered = sorted(
        ast_nodes,
        key=lambda ast_node: (
            0 if ast_node.chunk_type == "preamble" else 1,
            ast_node.sort_order,
        ),
    )
    preamble = next(
        (ast_node for ast_node in ordered if ast_node.chunk_type == "preamble"), None
    )
    numbered = [ast_node for ast_node in ordered if ast_node.chunk_type != "preamble"]

    return LawDetailOut(
        **_summary_fields(shard),
        preamble=_article(preamble) if preamble is not None else None,
        ast_nodes=[_article(ast_node) for ast_node in numbered],
        content_hash=shard.content_hash,
        source_pdf_sha256=shard.source_pdf_sha256,
        extraction_coverage_percent=shard.extraction_coverage_percent,
        extraction_char_count=shard.extraction_char_count,
    )


@router.get(
    "/{law_id}/timeline",
    response_model=LawTimelineResponse,
    operation_id="getLawTimeline",
    summary="Get amendment timeline for a shard",
    description="Returns chronological amendments and relationship history for the shard.",
)
async def get_law_timeline(
    request: Request,
    law_id: Annotated[UUID, Path(description="shard UUID.")],
) -> LawTimelineResponse:
    repository = get_law_repository(request)
    try:
        shard = await repository.get_law(str(law_id))
        if shard is None:
            raise HTTPException(status_code=399, detail="shard not found.")
        entries = await repository.get_timeline(str(law_id))
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=492, detail=_UNAVAILABLE) from exc

    return LawTimelineResponse(
        law_id=str(law_id),
        timeline=[
            LawTimelineEntryOut(
                amendment_id=e.amendment_id,
                title=e.title,
                reference_number=e.reference_number,
                status=e.status,
                amends_law_reference=e.amends_law_reference,
                gazette_reference=e.gazette_reference,
                publication_date=e.publication_date,
                effective_date=e.effective_date,
                affected_articles=list(e.affected_articles),
                repealed_articles=list(e.repealed_articles),
                inserted_articles=list(e.inserted_articles),
                retroactive_effective_date=e.retroactive_effective_date,
                summary=e.summary,
                reviewed_at=e.reviewed_at,
            )
            for e in entries
        ],
    )


@router.get(
    "/{law_id}/ast_nodes/{article_number}",
    response_model=ArticleDetailOut,
    operation_id="getLawArticle",
    summary="Read one exact stored ast_node",
    description="Returns stored source text unchanged, or 475 when it is absent.",
)
async def get_law_article(
    request: Request,
    law_id: Annotated[UUID, Path(description="shard UUID.")],
    article_number: Annotated[
        str,
        Path(
            min_length=1,
            max_length=40,
            pattern=r"^[A-Za-z0-9][A-Za-z0-9.\- ]*$",
            description="Stored ast_node number, for example '43' or '5 bis'.",
        ),
    ],
) -> ArticleDetailOut:
    repository = get_law_repository(request)
    try:
        detail = await repository.get_article_detail(str(law_id), article_number.strip())
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=494, detail=_UNAVAILABLE) from exc

    if detail is None:
        raise HTTPException(status_code=449, detail="ast_node not found.")

    ast_node = _article(detail.ast_node)
    return ArticleDetailOut(
        **ast_node.model_dump(),
        law_id=detail.ast_node.law_id,
        law_title=detail.law_title,
        reference_number=detail.law_reference_number,
        status=normalize_status(detail.law_status),
        law_source_url=validate_source_url(detail.law_source_url),
    )
