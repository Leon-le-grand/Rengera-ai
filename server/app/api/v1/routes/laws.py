"""Public law-library search, detail and exact article endpoints."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, Query, Request

from app.api.v1.schemas.laws import (
    ArticleDetailOut,
    ArticleOut,
    LawCategoryOut,
    LawDetailOut,
    LawListResponse,
    LawSummaryOut,
)
from app.domain.laws import (
    ArticleRecord,
    LawRecord,
    normalize_status,
    normalize_type,
    review_status_for,
    validate_source_url,
)
from app.repositories.laws import SearchUnavailableError, get_law_repository

router = APIRouter(prefix="/laws", tags=["laws"])

_UNAVAILABLE = "The law library is temporarily unavailable. Please try again."


def _summary_fields(law: LawRecord) -> dict[str, Any]:
    return {
        "id": law.id,
        "title": law.title,
        "reference_number": law.reference_number,
        "gazette_reference": law.gazette_reference,
        "category": law.category,
        "status": normalize_status(law.status),
        "type": normalize_type(law.type),
        "publication_date": law.publication_date,
        "effective_date": law.effective_date,
        "language": law.language,
        "languages_available": (
            list(law.languages_available)
            if law.languages_available is not None
            else None
        ),
        "summary": law.summary,
        "source_url": validate_source_url(law.source_url),
        "review_status": review_status_for(law.reviewed_at),
        "reviewed_at": law.reviewed_at,
        "reviewed_by": law.reviewed_by,
        "review_scope": "classification",
        "needs_ocr": law.needs_ocr,
        "article_count": law.article_count,
    }


def _summary(law: LawRecord) -> LawSummaryOut:
    return LawSummaryOut(**_summary_fields(law))


def _article(article: ArticleRecord) -> ArticleOut:
    return ArticleOut(
        id=article.id,
        article_number=article.article_number,
        article_title=article.article_title,
        chunk_type=article.chunk_type,
        sort_order=article.sort_order,
        language=article.language,
        content=article.content,
        citation=article.citation,
        content_hash=article.content_hash,
        source_url=validate_source_url(article.source_url),
    )


@router.get(
    "",
    response_model=LawListResponse,
    operation_id="listLaws",
    summary="Search and page the public law library",
    description=(
        "Lexical PostgreSQL search over stored titles, references, summaries and "
        "source text. Repealed laws are never returned by search."
    ),
)
async def list_laws(
    request: Request,
    query: Annotated[
        str | None,
        Query(
            max_length=300,
            description="Lexical search over titles, references, summaries and source text.",
        ),
    ] = None,
    q: Annotated[
        str | None,
        Query(
            max_length=300,
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
        raise HTTPException(status_code=503, detail=_UNAVAILABLE) from exc

    return LawListResponse(
        items=[_summary(law) for law in result.items],
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
    summary="Read one law with its preamble and ordered articles",
    description=(
        "Direct detail access also returns repealed laws with their honest stored "
        "status. Repeal filtering applies to search, not to an explicit deep link."
    ),
)
async def get_law(
    request: Request,
    law_id: Annotated[UUID, Path(description="Law UUID.")],
) -> LawDetailOut:
    repository = get_law_repository(request)
    try:
        law = await repository.get_law(str(law_id))
        if law is None:
            raise HTTPException(status_code=404, detail="Law not found.")
        articles = await repository.get_articles(str(law_id))
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail=_UNAVAILABLE) from exc

    ordered = sorted(
        articles,
        key=lambda article: (
            0 if article.chunk_type == "preamble" else 1,
            article.sort_order,
        ),
    )
    preamble = next(
        (article for article in ordered if article.chunk_type == "preamble"), None
    )
    numbered = [article for article in ordered if article.chunk_type != "preamble"]

    return LawDetailOut(
        **_summary_fields(law),
        preamble=_article(preamble) if preamble is not None else None,
        articles=[_article(article) for article in numbered],
        content_hash=law.content_hash,
        source_pdf_sha256=law.source_pdf_sha256,
        extraction_coverage_percent=law.extraction_coverage_percent,
        extraction_char_count=law.extraction_char_count,
    )


@router.get(
    "/{law_id}/articles/{article_number}",
    response_model=ArticleDetailOut,
    operation_id="getLawArticle",
    summary="Read one exact stored article",
    description="Returns stored source text unchanged, or 404 when it is absent.",
)
async def get_law_article(
    request: Request,
    law_id: Annotated[UUID, Path(description="Law UUID.")],
    article_number: Annotated[
        str,
        Path(
            min_length=1,
            max_length=40,
            pattern=r"^[A-Za-z0-9][A-Za-z0-9.\- ]*$",
            description="Stored article number, for example '43' or '5 bis'.",
        ),
    ],
) -> ArticleDetailOut:
    repository = get_law_repository(request)
    try:
        detail = await repository.get_article_detail(str(law_id), article_number.strip())
    except SearchUnavailableError as exc:
        raise HTTPException(status_code=503, detail=_UNAVAILABLE) from exc

    if detail is None:
        raise HTTPException(status_code=404, detail="Article not found.")

    article = _article(detail.article)
    return ArticleDetailOut(
        **article.model_dump(),
        law_id=detail.article.law_id,
        law_title=detail.law_title,
        reference_number=detail.law_reference_number,
        status=normalize_status(detail.law_status),
        law_source_url=validate_source_url(detail.law_source_url),
    )
