"""Deterministic safety routing, guards and localized citizen copy."""

from __future__ import annotations

import pytest

from app.safety.emergency import (
    URGENT_PATTERNS,
    detect_emergency,
    emergency_guidance,
    render_emergency_text,
)
from app.safety.guards import (
    greeting_reply,
    help_reply,
    is_greeting,
    is_help_request,
)
from app.safety.messages import (
    ABSTAIN_MESSAGES,
    CITATION_ABSTAIN_MESSAGES,
    CITATION_CAVEATS,
    DISCLAIMERS,
    AnswerLanguage,
    message_for,
)

LANGUAGES = (AnswerLanguage.EN, AnswerLanguage.RW, AnswerLanguage.FR)


@pytest.mark.parametrize("pattern", URGENT_PATTERNS)
def test_every_legacy_urgent_pattern_routes_to_help(pattern: str) -> None:
    assert detect_emergency(f"Please, there is {pattern} happening now.")


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("I ate a grape at the market", False),
        ("The shipment weighed one kilogram", False),
        ("My employer threatened to kill me", True),
        ("Umugabo wanjye arambwira ngo arampisha", False),
    ],
)
def test_urgent_matching_does_not_use_naive_substrings(text: str, expected: bool) -> None:
    assert detect_emergency(text) is expected


@pytest.mark.parametrize("language", LANGUAGES)
def test_urgent_guidance_has_official_contacts_and_localized_actions(
    language: AnswerLanguage,
) -> None:
    guidance = emergency_guidance(language)
    assert guidance.title
    assert guidance.summary
    assert len(guidance.immediate_actions) >= 3
    assert [contact.phone for contact in guidance.contacts] == ["112", "166", "3029"]
    rendered = render_emergency_text(guidance, language)
    assert "112" in rendered
    assert "166" in rendered
    assert "3029" in rendered


@pytest.mark.parametrize(
    ("question", "language"),
    [
        ("hello", "en"),
        ("Muraho!", "rw"),
        ("Bonjour", "fr"),
    ],
)
def test_short_greetings_are_detected_in_all_supported_languages(
    question: str, language: str
) -> None:
    assert is_greeting(question, has_article_context=False)
    assert greeting_reply(AnswerLanguage(language))


def test_greeting_guard_yields_to_legal_content_and_context() -> None:
    assert not is_greeting("What does Article 43 say?", has_article_context=False)
    assert not is_greeting("hello", has_article_context=True)
    assert not is_help_request("hello", has_article_context=False)


def test_help_guard_handles_short_requests_only() -> None:
    assert is_help_request("help", has_article_context=False)
    assert is_help_request("I need help", has_article_context=False)
    assert not is_help_request("help", has_article_context=True)
    assert not is_help_request(
        "Please help me understand Article 43 of this law",
        has_article_context=False,
    )
    assert help_reply(AnswerLanguage.RW)


@pytest.mark.parametrize("language", LANGUAGES)
@pytest.mark.parametrize(
    "messages",
    [ABSTAIN_MESSAGES, CITATION_ABSTAIN_MESSAGES, CITATION_CAVEATS, DISCLAIMERS],
)
def test_every_safety_message_exists_in_every_supported_language(
    messages: dict[AnswerLanguage, str], language: AnswerLanguage
) -> None:
    assert message_for(messages, language).strip()


def test_missing_language_falls_back_to_english_safety_copy() -> None:
    # Defensive fallback only: the request schema rejects unsupported languages.
    assert message_for(DISCLAIMERS, "de") == DISCLAIMERS[AnswerLanguage.EN]  # type: ignore[arg-type]
