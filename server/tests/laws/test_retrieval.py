"""Deterministic reference parsing, evidence bounds and citation checks."""

from __future__ import annotations

from helpers import LAW_ID, make_evidence

from app.retrieval.citations import (
    ABSTAIN_REASON_EMPTY,
    ABSTAIN_REASON_INVALID_EVIDENCE,
    ABSTAIN_REASON_UNCITED,
    ABSTAIN_REASON_UNRESOLVED,
    UNVERIFIED_REFERENCE_MARKER,
    validate_completion,
)
from app.retrieval.evidence import (
    MAX_EVIDENCE_ITEMS,
    MAX_PASSAGE_CHARS,
    TRUNCATION_MARKER,
    build_evidence,
)
from app.retrieval.prompting import build_messages
from app.retrieval.references import (
    normalize_article_number,
    normalize_law_reference,
    parse_exact_reference,
)
from app.safety.messages import AnswerLanguage


def test_exact_english_reference_is_parsed() -> None:
    reference = parse_exact_reference(
        "What does Article 43 of Law n° 027/2023 say about working hours?"
    )

    assert reference.law_reference == "027/2023"
    assert reference.article_numbers == ("43",)
    assert reference.has_any


def test_kinyarwanda_and_french_references_are_parsed() -> None:
    kinyarwanda = parse_exact_reference("Ingingo ya 5 bis y'Itegeko n° 66/2018 ivuga iki?")
    french = parse_exact_reference("Que dit l'article 12 de la loi n° 01/2020 ?")

    assert kinyarwanda.law_reference == "66/2018"
    assert kinyarwanda.article_numbers == ("5 bis",)
    assert french.law_reference == "01/2020"
    assert french.article_numbers == ("12",)


def test_question_without_exact_reference_is_not_forced_into_one() -> None:
    reference = parse_exact_reference("How many hours may I work each week?")

    assert reference.law_reference is None
    assert reference.article_numbers == ()
    assert not reference.has_any


def test_reference_normalization_preserves_article_suffixes() -> None:
    assert normalize_article_number(" 5   BIS ") == "5 bis"
    assert normalize_law_reference(" N° 027 / 2023 ") == "027/2023"


def test_evidence_is_bounded_deduplicated_and_skips_empty_text() -> None:
    sources = [
        make_evidence(
            article_id=f"article-{number}",
            article_number=str(number),
            article_content=f"Article {number} source text.",
        )
        for number in range(1, 9)
    ]
    sources.append(make_evidence(article_id="empty", article_number="9", article_content="  "))
    sources.append(make_evidence(article_id="duplicate", article_number="1"))

    passages = build_evidence(sources)

    assert len(passages) == MAX_EVIDENCE_ITEMS
    assert [passage.evidence_id for passage in passages] == [
        f"E{number}" for number in range(1, MAX_EVIDENCE_ITEMS + 1)
    ]
    assert [passage.source.article_number for passage in passages] == [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
    ]


def test_long_article_is_truncated_with_a_visible_marker() -> None:
    passage = build_evidence(
        (
            make_evidence(
                article_id="long",
                article_content="x" * (MAX_PASSAGE_CHARS + 500),
            ),
        )
    )[0]

    assert passage.text.endswith(TRUNCATION_MARKER)
    assert len(passage.text) <= MAX_PASSAGE_CHARS + len(TRUNCATION_MARKER)


def _passages(*numbers: str):
    return build_evidence(
        tuple(
            make_evidence(
                article_id=f"article-{number}",
                article_number=number,
                article_content=f"Source text of Article {number}.",
                citation=f"Article {number} of Law n° 027/2023",
            )
            for number in numbers
        )
    )


def test_valid_answer_uses_only_the_citations_it_contains() -> None:
    passages = _passages("43", "44")
    validation = validate_completion(
        "Article 43 limits ordinary hours [E1]. Article 44 covers overtime [E2].",
        passages,
    )

    assert not validation.abstain
    assert validation.used_evidence_ids == ("E1", "E2")
    assert validation.unresolved_count == 0


def test_answer_without_evidence_token_abstains() -> None:
    validation = validate_completion("Article 43 limits hours.", _passages("43"))

    assert validation.abstain
    assert validation.reason == ABSTAIN_REASON_UNCITED


def test_answer_with_unknown_evidence_token_abstains_entirely() -> None:
    validation = validate_completion("Article 43 limits hours [E7].", _passages("43"))

    assert validation.abstain
    assert validation.reason == ABSTAIN_REASON_INVALID_EVIDENCE
    assert validation.answer == ""


def test_more_than_thirty_percent_unresolved_references_abstains() -> None:
    validation = validate_completion(
        "Article 99 limits hours [E1].",
        _passages("43"),
    )

    assert validation.abstain
    assert validation.reason == ABSTAIN_REASON_UNRESOLVED


def test_minority_fabricated_reference_is_removed_with_a_marker() -> None:
    validation = validate_completion(
        "Article 43, Article 44, Article 45 and Article 99 apply [E1].",
        _passages("43", "44", "45"),
    )

    assert not validation.abstain
    assert "Article 99" not in validation.answer
    assert UNVERIFIED_REFERENCE_MARKER in validation.answer
    assert validation.unresolved_count == 1


def test_fabricated_url_is_removed() -> None:
    validation = validate_completion(
        (
            "Article 43 of Law n° 027/2023 applies [E1]. "
            "See https://example.test/laws/027-2023.pdf#page=12 and "
            "https://fake.example/not-a-source."
        ),
        _passages("43"),
    )

    assert not validation.abstain
    assert "fake.example" not in validation.answer


def test_empty_completion_abstains() -> None:
    validation = validate_completion("   ", _passages("43"))

    assert validation.abstain
    assert validation.reason == ABSTAIN_REASON_EMPTY


def test_prompt_contains_only_supplied_evidence_and_language_rules() -> None:
    messages = build_messages(
        "How many hours may I work each week?",
        AnswerLanguage.RW,
        _passages("43"),
    )

    system, user = messages
    assert "Use ONLY the numbered evidence passages" in system.content
    assert "Kinyarwanda" in system.content
    assert "[E1]" in user.content
    assert "Article 43" in user.content
    assert f"Law ID: {LAW_ID}" not in user.content
    assert "API_KEY" not in user.content
