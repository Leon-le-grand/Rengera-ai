"""Public law search, detail and exact-article HTTP behavior."""

from __future__ import annotations

from fastapi.testclient import TestClient
from helpers import (
    LAW_ID,
    FakeLawRepository,
    article_detail,
    make_article,
    make_law,
)

from app.domain.laws import CategoryRecord, LawPage
from app.repositories.laws import SearchUnavailableError


def test_search_forwards_filters_and_reports_pagination(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    repository.page = LawPage(items=(make_law(),), page=2, page_size=10, total=11)

    response = api_client.get(
        "/v1/laws",
        params={
            "q": " labour ",
            "category": " Labour ",
            "status": "ACTIVE",
            "page": 2,
            "page_size": 10,
        },
    )

    assert response.status_code == 200
    assert repository.calls[0][2] == {
        "query": "labour",
        "category": "Labour",
        "status": "active",
        "page": 2,
        "page_size": 10,
    }
    body = response.json()
    assert body["page"] == 2
    assert body["page_size"] == 10
    assert body["total"] == 11
    assert len(body["items"]) == 1


def test_search_accepts_the_versioned_query_parameter(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    repository.page = LawPage(items=(make_law(),), page=1, page_size=20, total=1)

    response = api_client.get("/v1/laws", params={"query": "  notice  "})

    assert response.status_code == 200
    assert repository.calls[0][2]["query"] == "notice"


def test_list_returns_the_category_catalog_with_counts(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    repository.categories = (
        CategoryRecord(id="labour-id", label="Labour", count=7),
        CategoryRecord(id="land-id", label="Land", count=3),
    )

    body = api_client.get("/v1/laws").json()

    assert body["categories"] == [
        {"id": "labour-id", "label": "Labour", "count": 7},
        {"id": "land-id", "label": "Land", "count": 3},
    ]


def test_list_preserves_unknown_status_missing_languages_and_review_scope(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    repository.page = LawPage(
        items=(
            make_law(
                status="",
                type="",
                languages_available=None,
                source_url="https://example.test",
                reviewed_by="reviewer-1",
            ),
        ),
        page=1,
        page_size=20,
        total=1,
    )

    body = api_client.get("/v1/laws").json()["items"][0]

    assert body["status"] == "unknown"
    assert body["type"] == "unknown"
    assert body["languages_available"] is None
    assert body["source_url"] is None
    assert body["review_scope"] == "classification"
    assert body["review_status"] == "reviewed"
    assert body["reviewed_by"] == "reviewer-1"
    assert body["reviewed_at"] is not None


def test_unreviewed_law_reports_pending_classification_review(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    repository.page = LawPage(
        items=(make_law(reviewed_at=None, reviewed_by=None),),
        page=1,
        page_size=20,
        total=1,
    )

    body = api_client.get("/v1/laws").json()["items"][0]

    assert body["review_status"] == "pending"
    assert body["reviewed_at"] is None


def test_list_returns_503_instead_of_an_empty_library_on_outage(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    repository.fail = SearchUnavailableError("down")
    repository.fail_method = "search_laws"

    response = api_client.get("/v1/laws")

    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["detail"]


def test_list_rejects_invalid_pagination_and_oversized_filters(
    api_client: TestClient,
) -> None:
    assert api_client.get("/v1/laws", params={"page": 0}).status_code == 422
    assert api_client.get("/v1/laws", params={"page_size": 51}).status_code == 422
    assert api_client.get("/v1/laws", params={"q": "x" * 301}).status_code == 422


def test_detail_separates_preamble_and_keeps_article_order_and_text(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    law = make_law(article_count=2)
    preamble = make_article(
        id="preamble-id",
        article_number="Preamble",
        article_title=None,
        chunk_type="preamble",
        sort_order=0,
        content="We, the people of Rwanda, adopt this law.",
        citation="Preamble of Law n° 027/2023",
    )
    article_42 = make_article(
        id="article-42",
        article_number="42",
        sort_order=42,
        content="Article forty-two text.",
        citation="Article 42 of Law n° 027/2023",
    )
    article_43 = make_article(id="article-43")
    repository.law = law
    repository.articles = (article_43, preamble, article_42)

    response = api_client.get(f"/v1/laws/{LAW_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["preamble"]["content"] == "We, the people of Rwanda, adopt this law."
    assert [article["article_number"] for article in body["articles"]] == ["42", "43"]
    assert body["articles"][1]["content"] == article_43.content
    assert body["articles"][0]["citation"] == "Article 42 of Law n° 027/2023"
    assert body["content_hash"] == "law-hash"
    assert body["source_pdf_sha256"] == "pdf-hash"
    assert body["extraction_coverage_percent"] == 97
    assert body["extraction_char_count"] == 120_000


def test_direct_detail_read_still_returns_a_repealed_law_with_honest_status(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    repository.law = make_law(status="repealed")
    repository.articles = ()

    response = api_client.get(f"/v1/laws/{LAW_ID}")

    assert response.status_code == 200
    assert response.json()["status"] == "repealed"


def test_detail_and_article_return_404_for_missing_rows(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    assert api_client.get(f"/v1/laws/{LAW_ID}").status_code == 404
    assert api_client.get(f"/v1/laws/{LAW_ID}/articles/99").status_code == 404


def test_detail_returns_503_when_article_read_fails(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    repository.law = make_law()
    repository.fail = SearchUnavailableError("down")
    repository.fail_method = "get_articles"

    assert api_client.get(f"/v1/laws/{LAW_ID}").status_code == 503


def test_article_returns_exact_text_citation_and_provenance(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    article = make_article(
        source_url="https://example.test/laws/027-2023.pdf#page=12",
    )
    repository.article_detail = article_detail(article=article)

    response = api_client.get(f"/v1/laws/{LAW_ID}/articles/43")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == article.id
    assert body["article_number"] == "43"
    assert body["article_title"] == "Working hours"
    assert body["content"] == article.content
    assert body["citation"] == "Article 43 of Law n° 027/2023"
    assert body["status"] == "active"
    assert body["law_title"] == "Law governing labour in Rwanda"
    assert body["law_source_url"] == "https://example.test/laws/027-2023.pdf"
    assert body["source_url"] == "https://example.test/laws/027-2023.pdf#page=12"


def test_article_missing_or_non_document_url_stays_null(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    article = make_article(source_url="https://example.test")
    repository.article_detail = article_detail(article=article)

    body = api_client.get(f"/v1/laws/{LAW_ID}/articles/43").json()

    assert body["source_url"] is None


def test_article_rejects_misshapen_numbers(api_client: TestClient) -> None:
    assert api_client.get(f"/v1/laws/{LAW_ID}/articles/43%21").status_code == 422
    assert api_client.get(f"/v1/laws/{LAW_ID}/articles/%20").status_code == 422
    assert api_client.get(f"/v1/laws/{LAW_ID}/articles/{'9' * 41}").status_code == 422


def test_article_returns_503_on_repository_outage(
    api_client: TestClient, repository: FakeLawRepository
) -> None:
    repository.fail = SearchUnavailableError("down")
    repository.fail_method = "get_article_detail"

    assert api_client.get(f"/v1/laws/{LAW_ID}/articles/43").status_code == 503
