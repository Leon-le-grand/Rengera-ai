"""Exact law/article reference parsing for deterministic retrieval."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Final

_ARTICLE_SUFFIX = r"(?:[ \t]*(?:bis|ter|quater|er|re|e|eme|ème|premier))?"
_ARTICLE_NUMBER = rf"\d+(?:\.\d+)?{_ARTICLE_SUFFIX}"

_ARTICLE_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(rf"\barticles?\s+({_ARTICLE_NUMBER})", re.IGNORECASE),
    re.compile(rf"\bingingo\s+(?:ya\s+)?({_ARTICLE_NUMBER})", re.IGNORECASE),
)

_LAW_REFERENCE_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(
        r"\b(?:law|loi|itegeko|iteka|it[eé]ka)\s*"
        r"(?:n[°ºo]?\s*\.?\s*)?(\d{1,4}\s*/\s*\d{4})",
        re.IGNORECASE,
    ),
    re.compile(r"\bn[°ºo]\s*\.?\s*(\d{1,4}\s*/\s*\d{4})", re.IGNORECASE),
)

_WHITESPACE = re.compile(r"\s+")


def normalize_article_number(value: str) -> str:
    """Normalize an article number for comparison without changing its digits."""
    return _WHITESPACE.sub(" ", value.strip()).lower()


def normalize_law_reference(value: str) -> str:
    """Reduce a law reference to its digits and slash for comparison."""
    normalized = re.sub(r"\s*/\s*", "/", value.strip())
    return re.sub(r"[^0-9/]", "", normalized)


@dataclass(frozen=True, slots=True)
class ExactReference:
    """References explicitly named in a citizen's question."""

    law_reference: str | None
    article_numbers: tuple[str, ...]

    @property
    def has_any(self) -> bool:
        return self.law_reference is not None or bool(self.article_numbers)


def parse_exact_reference(question: str) -> ExactReference:
    """Extract the first law reference and any article numbers deterministically."""
    article_numbers: list[str] = []
    for pattern in _ARTICLE_PATTERNS:
        for match in pattern.finditer(question):
            candidate = normalize_article_number(match.group(1))
            if candidate and candidate not in article_numbers:
                article_numbers.append(candidate)

    law_reference: str | None = None
    for pattern in _LAW_REFERENCE_PATTERNS:
        match = pattern.search(question)
        if match is not None:
            candidate = normalize_law_reference(match.group(1))
            if candidate:
                law_reference = candidate
                break

    return ExactReference(
        law_reference=law_reference,
        article_numbers=tuple(article_numbers),
    )
