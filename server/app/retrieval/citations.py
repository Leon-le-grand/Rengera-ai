"""Completion validation for evidence IDs and citation-shaped prose.

The model may only cite evidence that the server supplied. Any ``[E<n>]`` that
does not exist invalidates the completion. Article, law and URL references in
prose are checked against the same evidence; fabricated references are removed,
and a completion with more than 30% unresolved citations is rejected entirely.
"""

from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Final

from app.retrieval.evidence import EvidencePassage
from app.retrieval.references import normalize_article_number, normalize_law_reference

MAX_UNRESOLVED_RATIO: Final = 0.30
ABSTAIN_REASON_EMPTY = "empty_completion"
ABSTAIN_REASON_INVALID_EVIDENCE = "invalid_evidence_reference"
ABSTAIN_REASON_UNCITED = "missing_evidence_citation"
ABSTAIN_REASON_UNRESOLVED = "unresolved_citations"
UNVERIFIED_REFERENCE_MARKER: Final = "[unverified citation removed]"

_EVIDENCE_TOKEN = re.compile(r"\[E(\d+)\]")
_ARTICLE_SUFFIX = r"(?:[ \t]*(?:bis|ter|quater|er|re|e|eme|ème|premier))?"
_ARTICLE_REFERENCE = re.compile(
    rf"\b(?:articles?|ingingo)\s+(?:ya\s+)?(\d+(?:\.\d+)?{_ARTICLE_SUFFIX})",
    re.IGNORECASE,
)
_LAW_REFERENCE = re.compile(
    r"\b(?:law|loi|itegeko|iteka|it[eé]ka)\s*"
    r"(?:n[°ºo]?\s*\.?\s*)?(\d{1,4}\s*/\s*\d{4})",
    re.IGNORECASE,
)
_URL = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)
_TRAILING_URL_PUNCTUATION = ".,;:!?)]}>\"'"


@dataclass(frozen=True, slots=True)
class CitationValidation:
    """Outcome of validating one provider completion against the evidence."""

    answer: str
    used_evidence_ids: tuple[str, ...]
    unresolved_count: int
    abstain: bool
    reason: str | None


def _abstain(reason: str) -> CitationValidation:
    return CitationValidation(
        answer="",
        used_evidence_ids=(),
        unresolved_count=0,
        abstain=True,
        reason=reason,
    )


def _normalized_evidence_article_numbers(
    passages: Sequence[EvidencePassage],
) -> frozenset[str]:
    return frozenset(
        normalize_article_number(passage.source.article_number)
        for passage in passages
        if passage.source.article_number
    )


def _normalized_evidence_law_references(
    passages: Sequence[EvidencePassage],
) -> frozenset[str]:
    return frozenset(
        normalize_law_reference(passage.source.reference_number)
        for passage in passages
        if passage.source.reference_number
    )


def _normalized_evidence_urls(passages: Sequence[EvidencePassage]) -> frozenset[str]:
    return frozenset(
        passage.source.source_url
        for passage in passages
        if passage.source.source_url
    )


def _replace_spans(
    text: str,
    spans: Sequence[tuple[int, int, str]],
) -> str:
    sanitized = text
    for start, end, replacement in sorted(spans, key=lambda span: span[0], reverse=True):
        sanitized = f"{sanitized[:start]}{replacement}{sanitized[end:]}"
    return re.sub(r"[ \t]{2,}", " ", sanitized).strip()


def validate_completion(
    text: str,
    passages: Sequence[EvidencePassage],
) -> CitationValidation:
    """Validate a completion and return a sanitized answer or an abstention."""
    answer = (text or "").strip()
    if not answer:
        return _abstain(ABSTAIN_REASON_EMPTY)

    evidence_tokens = list(_EVIDENCE_TOKEN.finditer(answer))
    token_numbers: list[int] = []
    for token in evidence_tokens:
        number = int(token.group(1))
        if number < 1 or number > len(passages):
            return _abstain(ABSTAIN_REASON_INVALID_EVIDENCE)
        token_numbers.append(number)

    if passages and not token_numbers:
        return _abstain(ABSTAIN_REASON_UNCITED)

    article_numbers = _normalized_evidence_article_numbers(passages)
    law_references = _normalized_evidence_law_references(passages)
    source_urls = _normalized_evidence_urls(passages)

    resolved = len(token_numbers)
    unresolved = 0
    unresolved_spans: list[tuple[int, int, str]] = []

    for match in _ARTICLE_REFERENCE.finditer(answer):
        number = normalize_article_number(match.group(1))
        if number in article_numbers:
            resolved += 1
        else:
            unresolved += 1
            unresolved_spans.append(
                (match.start(), match.end(), UNVERIFIED_REFERENCE_MARKER)
            )

    for match in _LAW_REFERENCE.finditer(answer):
        reference = normalize_law_reference(match.group(1))
        if reference in law_references:
            resolved += 1
        else:
            unresolved += 1
            unresolved_spans.append(
                (match.start(), match.end(), UNVERIFIED_REFERENCE_MARKER)
            )

    for match in _URL.finditer(answer):
        url = match.group(0).rstrip(_TRAILING_URL_PUNCTUATION)
        if url in source_urls:
            resolved += 1
        else:
            unresolved += 1
            unresolved_spans.append((match.start(), match.end(), ""))

    total = resolved + unresolved
    if total and unresolved / total > MAX_UNRESOLVED_RATIO:
        return _abstain(ABSTAIN_REASON_UNRESOLVED)

    if unresolved_spans:
        answer = _replace_spans(answer, unresolved_spans)
        if not answer:
            return _abstain(ABSTAIN_REASON_EMPTY)

    used_ids = tuple(
        f"E{number}"
        for number in sorted(set(token_numbers))
        if f"[E{number}]" in answer
    )
    if passages and not used_ids:
        return _abstain(ABSTAIN_REASON_UNCITED)

    return CitationValidation(
        answer=answer,
        used_evidence_ids=used_ids,
        unresolved_count=unresolved,
        abstain=False,
        reason=None,
    )
