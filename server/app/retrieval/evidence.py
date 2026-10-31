"""Bounded evidence packaging for grounded answers.

Each passage gets a stable ``E1``-style identifier and keeps its law, article,
status, citation, URL and source hashes together. Full article text remains in
the database; only a bounded excerpt is sent to the model.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Final

from app.domain.laws import EvidenceSource

MAX_EVIDENCE_ITEMS: Final = 6
MAX_PASSAGE_CHARS: Final = 1_500
MAX_EVIDENCE_CHARS: Final = 8_000
MIN_TRAILING_PASSAGE_CHARS: Final = 200
TRUNCATION_MARKER: Final = " …[excerpt truncated]"


@dataclass(frozen=True, slots=True)
class EvidencePassage:
    """One bounded evidence excerpt with its server-assigned identifier."""

    evidence_id: str
    source: EvidenceSource
    text: str


def build_evidence(sources: Iterable[EvidenceSource]) -> tuple[EvidencePassage, ...]:
    """Deduplicate and bound retrieved articles into ``E1``-style passages."""
    passages: list[EvidencePassage] = []
    seen: set[tuple[str, str]] = set()
    total_chars = 0

    for source in sources:
        if len(passages) >= MAX_EVIDENCE_ITEMS:
            break
        key = (source.law_id, source.article_number)
        if key in seen:
            continue
        content = source.article_content.strip()
        if not content:
            continue

        remaining = MAX_EVIDENCE_CHARS - total_chars
        if passages and remaining < MIN_TRAILING_PASSAGE_CHARS:
            break
        budget = min(MAX_PASSAGE_CHARS, remaining)
        if budget <= 0:
            break

        if len(content) > budget:
            text = f"{content[:budget].rstrip()}{TRUNCATION_MARKER}"
        else:
            text = content

        seen.add(key)
        total_chars += len(text)
        passages.append(
            EvidencePassage(
                evidence_id=f"E{len(passages) + 1}",
                source=source,
                text=text,
            )
        )

    return tuple(passages)
