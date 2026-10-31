"""Greeting and help guards that avoid retrieval and model spend."""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Final

from app.safety.messages import AnswerLanguage

SMALL_TALK_PHRASES: Final[frozenset[str]] = frozenset(
    {
        "hi",
        "hy",
        "hey",
        "hello",
        "yo",
        "hye",
        "hee",
        "muraho",
        "mwaramutse",
        "mwiriwe",
        "mwiriweho",
        "bite",
        "bana",
        "bonjour",
        "salut",
        "bjr",
        "thanks",
        "thank you",
        "murakoze",
        "merci",
        "ok",
        "okay",
    }
)

HELP_PHRASES: Final[frozenset[str]] = frozenset(
    {
        "help",
        "help me",
        "help please",
        "help me please",
        "i need help",
        "need help",
        "ufashe",
        "mfashe",
        "mufashe",
        "aide",
        "aidez moi",
        "aide moi",
    }
)

GREETING_WORDS: Final[frozenset[str]] = frozenset(
    {
        "hi",
        "hey",
        "hello",
        "yo",
        "hy",
        "hye",
        "hee",
        "ok",
        "okay",
        "muraho",
        "mwaramutse",
        "mwiriwe",
        "mwiriweho",
        "bite",
        "bana",
        "bonjour",
        "salut",
        "bjr",
        "merci",
        "murakoze",
        "thanks",
        "thank",
    }
)

LEGAL_KEYWORDS: Final[re.Pattern[str]] = re.compile(
    r"article|ingingo|iteka|law|itegeko|amasezerano|code|constitution|decree|"
    r"n°|no\.?\s*\d|labour|murder|theft|land|divorce|contract|salary|leave|"
    r"pregnan|rape|police|rib|court|urukiko|ubutaka|akazi",
    re.IGNORECASE,
)

_GUARD_SEPARATORS = re.compile(r"[!\-.,?;:'\"()\[\]…\s]+")

SMALL_TALK_REPLIES: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "Hello! I am Rengera, your Rwandan legal assistant.\n\nAsk me a full legal "
        'question, for example: "What does Article 43 of Law n° 027/2023 mean for '
        'an employee?"'
    ),
    AnswerLanguage.RW: (
        "Mwaramutse! Nitwa Rengera, umufasha wawe mu mategeko.\n\nBaza ikibazo "
        "cyuzuye cy'amategeko, urugero: \"Ingingo ya 43 y'Itegeko n° 027/2023 "
        'ivuga iki ku mukozi?"'
    ),
    AnswerLanguage.FR: (
        "Bonjour ! Je suis Rengera, votre assistant juridique.\n\nPosez une vraie "
        "question juridique, par exemple : « Que dit l'article 43 de la loi "
        "n° 027/2023 pour un employé ? »"
    ),
}

HELP_REPLIES: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "I can explain Rwandan laws in plain language.\n\nTell me what happened "
        'and what you need — for example: "My landlord locked me out, what are my '
        'rights?" or "What does Article 43 of Law n° 027/2023 say about working '
        'hours?"\n\nI will quote the exact article and tell you what to do next.'
    ),
    AnswerLanguage.RW: (
        "Nshobora gusobanura amategeko y'u Rwanda mu magambo yoroshye.\n\nMbwira "
        "ibyakubayeho n'icyo ukeneye — urugero: \"Nyagasani w'inzu yampfungiye "
        "hanze, ni ayahe mahoro mfite?\" cyangwa \"Ingingo ya 43 y'Itegeko "
        "n° 027/2023 ivuga iki?\""
    ),
    AnswerLanguage.FR: (
        "Je peux expliquer les lois rwandaises en langage simple.\n\nDécrivez ce "
        "qui s'est passé — par exemple : « Mon bailleur m'a mis dehors, quels sont "
        "mes droits ? » ou « Que dit l'article 43 de la loi n° 027/2023 ? »"
    ),
}


def _normalize(question: str) -> str:
    return _GUARD_SEPARATORS.sub(" ", question.strip().lower()).strip()


def is_help_request(question: str, *, has_article_context: bool) -> bool:
    """Return whether the question is a short "help me" how-to request."""
    if has_article_context:
        return False
    normalized = _normalize(question)
    if not normalized or len(normalized) > 32:
        return False
    if LEGAL_KEYWORDS.search(normalized):
        return False
    return normalized in HELP_PHRASES


def is_greeting(question: str, *, has_article_context: bool) -> bool:
    """Return whether the question is small talk with no legal content."""
    if has_article_context:
        return False
    normalized = _normalize(question)
    if not normalized or len(normalized) > 24:
        return False
    if LEGAL_KEYWORDS.search(normalized):
        return False
    if normalized in HELP_PHRASES:
        return False
    if normalized in SMALL_TALK_PHRASES:
        return True
    words = normalized.split(" ")
    if len(words) <= 2 and len(normalized) <= 14 and not re.search(r"\d", normalized):
        return all(word in GREETING_WORDS for word in words)
    return False


def greeting_reply(language: AnswerLanguage) -> str:
    return SMALL_TALK_REPLIES.get(language, SMALL_TALK_REPLIES[AnswerLanguage.EN])


def help_reply(language: AnswerLanguage) -> str:
    return HELP_REPLIES.get(language, HELP_REPLIES[AnswerLanguage.EN])
