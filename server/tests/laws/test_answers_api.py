"""Grounded answer outcomes, guards, evidence use and dependency failures."""

from __future__ import annotations

from fastapi.testclient import TestClient
from helpers import (
    LAW_ID,
    FakeChatProvider,
    FakeLawRepository,
    make_evidence,
    make_law,
)

from app.providers.base import ProviderUnavailableError
from app.repositories.laws import SearchUnavailableError


def ask(
    client: TestClient,
    question: str,
    *,
    language: str = "en",
    **extra: object,
) -> dict[str, object]:
    response = client.post(
        "/v1/answers",
        json={"question": question, "language": language, **extra},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_emergency_is_routed_before_any_repository_or_provider_work(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    body = ask(api_client, "My husband threatened to kill me")

    assert body["kind"] == "emergency"
    assert body["abstention_reason"] is None
    assert body["sources"] == []
    emergency = body["emergency"]
    assert isinstance(emergency, dict)
    assert [contact["phone"] for contact in emergency["contacts"]] == [
        "112",
        "166",
        "3029",
    ]
    assert "112" in body["answer"]
    assert repository.calls == []
    assert provider.calls == []


def test_emergency_wins_even_when_an_article_was_selected(
    api_client: TestClient,
    repository: FakeLawRepository,
) -> None:
    body = ask(
        api_client,
        "My husband threatened to kill me, what can I do?",
        law_id=LAW_ID,
        article_number="43",
    )

    assert body["kind"] == "emergency"
    assert repository.calls == []


def test_greeting_and_help_skip_retrieval_and_the_model(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    greeting = ask(api_client, "hello")
    help_body = ask(api_client, "help", language="fr")

    assert greeting["kind"] == "greeting"
    assert "Rengera" in greeting["answer"]
    assert help_body["kind"] == "help"
    assert help_body["answer"]
    assert repository.calls == []
    assert provider.calls == []


def test_greeting_uses_the_requested_language(
    api_client: TestClient,
) -> None:
    body = ask(api_client, "Muraho", language="rw")

    assert body["kind"] == "greeting"
    assert "Mwaramutse" in body["answer"]


def test_abstention_and_emergency_copy_follow_the_requested_language(
    api_client: TestClient,
) -> None:
    abstained = ask(api_client, "What are my rights as a tenant?", language="fr")
    emergency = ask(api_client, "C'est une urgence, je suis en danger", language="fr")

    assert abstained["kind"] == "abstained"
    assert "bibliothèque" in abstained["answer"]
    assert "conseil juridique" in abstained["disclaimer"]
    assert emergency["kind"] == "emergency"
    assert "sécurité" in emergency["disclaimer"] or "sécurité" in emergency["answer"]


def test_no_evidence_abstains_without_calling_the_provider(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    body = ask(api_client, "What are my rights as a tenant?")

    assert body["kind"] == "abstained"
    assert body["abstention_reason"] == "no_evidence"
    assert body["sources"] == []
    assert provider.calls == []
    assert repository.methods() == ["search_evidence"]


def test_answered_response_exposes_only_cited_evidence_and_its_provenance(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    source = make_evidence()
    second = make_evidence(
        article_id="second-article",
        article_number="44",
        article_title="Overtime",
        citation="Article 44 of Law n° 027/2023",
        article_content="Overtime requires agreement.",
    )
    repository.search_evidence_result = (source, second)
    provider.completion = (
        "Article 43 limits ordinary hours and Article 44 covers overtime [E1]."
    )

    body = ask(api_client, "How many hours may I work each week?")

    assert body["kind"] == "answered"
    assert body["abstention_reason"] is None
    assert body["answer"].startswith("Article 43")
    assert body["disclaimer"]
    assert len(body["sources"]) == 1
    evidence = body["sources"][0]
    assert evidence["evidence_id"] == "E1"
    assert evidence["article_number"] == "43"
    assert evidence["status"] == "active"
    assert evidence["review_status"] == "reviewed"
    assert evidence["excerpt"] == source.article_content
    assert evidence["source_url"] == "https://example.test/laws/027-2023.pdf#page=12"
    assert evidence["article_content_hash"] == "article-hash"
    assert evidence["law_content_hash"] == "law-hash"
    assert body["request_id"]


def test_provider_receives_bounded_evidence_only_prompt(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.search_evidence_result = (make_evidence(),)
    provider.completion = "Article 43 applies [E1]."

    ask(api_client, "How many hours may I work each week?")

    call = provider.calls[0]
    system = call.messages[0].content
    user = call.messages[1].content
    assert "Use ONLY the numbered evidence passages" in system
    assert "English" in system
    assert "How many hours may I work each week?" in user
    assert "[E1]" in user
    assert "Article 43 of Law n° 027/2023" in user
    assert call.max_tokens <= 900
    assert call.temperature <= 1


def test_client_supplied_article_text_is_rejected_not_forwarded(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.search_evidence_result = (make_evidence(),)
    provider.completion = "Article 43 applies [E1]."

    response = api_client.post(
        "/v1/answers",
        json={
            "question": "How many hours may I work each week?",
            "language": "en",
            "article_text": "CLIENT INJECTED ARTICLE TEXT",
        },
    )

    assert response.status_code == 422
    assert provider.calls == []


def test_explicit_law_and_article_are_fetched_server_side(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.evidence_article = make_evidence()
    provider.completion = "Article 43 applies [E1]."

    body = ask(
        api_client,
        "What does this provision require?",
        law_id=LAW_ID,
        article_number="43",
    )

    assert body["kind"] == "answered"
    assert repository.methods() == ["get_evidence_article"]
    assert repository.calls[0][1] == (LAW_ID, "43")
    assert "search_evidence" not in repository.methods()


def test_explicit_article_number_without_law_id_is_supported(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.evidence_by_number = (make_evidence(),)
    provider.completion = "Article 43 applies [E1]."

    body = ask(
        api_client,
        "What does this provision require?",
        article_number="43",
    )

    assert body["kind"] == "answered"
    assert repository.methods() == ["find_evidence_by_article_number"]
    assert repository.calls[0][1] == ("43",)


def test_named_law_and_article_resolve_without_lexical_fallback(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.law_by_reference = make_law()
    repository.evidence_article = make_evidence()
    provider.completion = "Article 43 applies [E1]."

    body = ask(
        api_client,
        "What does Article 43 of Law n° 027/2023 say about working hours?",
    )

    assert body["kind"] == "answered"
    assert repository.methods() == ["find_law_by_reference", "get_evidence_article"]
    assert repository.calls[0][1] == ("027/2023",)
    assert "search_evidence" not in repository.methods()


def test_named_law_that_does_not_exist_abstains_instead_of_fuzzy_matching(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    body = ask(
        api_client,
        "What does Article 43 of Law n° 999/1999 say about working hours?",
    )

    assert body["kind"] == "abstained"
    assert body["abstention_reason"] == "no_evidence"
    assert repository.methods() == ["find_law_by_reference"]
    assert provider.calls == []


def test_unconfigured_provider_is_a_503_error_not_an_abstention(
    api_client: TestClient,
    repository: FakeLawRepository,
) -> None:
    repository.search_evidence_result = (make_evidence(),)
    api_client.app.state.chat_provider = None  # type: ignore[attr-defined]

    response = api_client.post(
        "/v1/answers",
        json={"question": "How many hours may I work each week?", "language": "en"},
    )

    assert response.status_code == 503
    body = response.json()
    assert body["error"]["code"] == "provider_not_configured"
    assert body["error"]["request_id"] == response.headers["X-Request-ID"]


def test_provider_outage_is_a_502_error(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.search_evidence_result = (make_evidence(),)
    provider.error = ProviderUnavailableError("down")

    response = api_client.post(
        "/v1/answers",
        json={"question": "How many hours may I work each week?", "language": "en"},
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "provider_unavailable"


def test_search_outage_is_a_503_not_an_empty_corpus_abstention(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.fail = SearchUnavailableError("down")
    repository.fail_method = "search_evidence"

    response = api_client.post(
        "/v1/answers",
        json={"question": "How many hours may I work each week?", "language": "en"},
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "search_unavailable"
    assert provider.calls == []


def test_nonexistent_evidence_token_invalidates_the_completion(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.search_evidence_result = (make_evidence(),)
    provider.completion = "Article 43 says forty-five hours [E9]."

    body = ask(api_client, "How many hours may I work each week?")

    assert body["kind"] == "abstained"
    assert body["abstention_reason"] == "invalid_evidence_reference"
    assert body["sources"] == []


def test_uncited_completion_abstains_when_evidence_exists(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.search_evidence_result = (make_evidence(),)
    provider.completion = "Article 43 says forty-five hours."

    body = ask(api_client, "How many hours may I work each week?")

    assert body["kind"] == "abstained"
    assert body["abstention_reason"] == "missing_evidence_citation"


def test_majority_fabricated_citations_abstain(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.search_evidence_result = (make_evidence(),)
    provider.completion = "Article 99 creates a new rule [E1]."

    body = ask(api_client, "How many hours may I work each week?")

    assert body["kind"] == "abstained"
    assert body["abstention_reason"] == "unresolved_citations"


def test_minor_fabricated_citation_is_removed_and_disclosed(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.search_evidence_result = (
        make_evidence(),
        make_evidence(
            article_id="a44",
            article_number="44",
            citation="Article 44 of Law n° 027/2023",
        ),
        make_evidence(
            article_id="a45",
            article_number="45",
            citation="Article 45 of Law n° 027/2023",
        ),
    )
    provider.completion = (
        "Article 43, Article 44, Article 45 and Article 99 all apply [E1]."
    )

    body = ask(api_client, "How many hours may I work each week?")

    assert body["kind"] == "answered"
    assert "Article 99" not in body["answer"]
    assert "[unverified citation removed]" in body["answer"]
    assert "could not be verified" in body["answer"]
    assert len(body["sources"]) == 1


def test_answer_length_cap_never_returns_uncited_claims(
    api_client: TestClient,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> None:
    repository.search_evidence_result = (make_evidence(),)
    provider.completion = ("x" * 6_500) + " [E1]"

    body = ask(api_client, "How many hours may I work each week?")

    assert body["kind"] == "abstained"
    assert body["abstention_reason"] == "citation_truncated"
    assert body["sources"] == []


def test_question_and_language_validation(api_client: TestClient) -> None:
    assert (
        api_client.post(
            "/v1/answers", json={"question": "a", "language": "en"}
        ).status_code
        == 422
    )
    assert (
        api_client.post(
            "/v1/answers", json={"question": "ok", "language": "de"}
        ).status_code
        == 422
    )
    assert api_client.post("/v1/answers", json={"language": "en"}).status_code == 422
