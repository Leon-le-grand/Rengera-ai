"""Strict statutory text parser preserving source fidelity and provenance.

Conforms to Domain Invariants:
* Never overwrite or paraphrase shards.raw_content or ast_node content.
* Keep ast_node text verbatim, including preamble content.
* Extract headings without losing text between boundaries.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass
from typing import Final

LIGATURES: Final[dict[str, str]] = {
    "\ufb00": "ff",
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
    "\ufb05": "st",
    "\ufb06": "st",
    "\u017f": "s",
    "\u0153": "oe",
    "\u0152": "OE",
    "\u00e6": "ae",
    "\u00c6": "AE",
    "\u00df": "ss",
}
LIGATURE_RE: Final[re.Pattern[str]] = re.compile("|".join(re.escape(k) for k in LIGATURES))
SOFT_HYPHEN: Final[str] = "\u00ad"
HYPHEN_BREAK_RE: Final[re.Pattern[str]] = re.compile(r"(\w)[-\u2010\u2011\u2012]\n(?=\w)")

ARTICLE_NUMBER: Final[str] = (
    r"\d+(?:\.\d+)?(?:[ \t]*(?:er|re|ter|e|eme|ème|bis|deuxième|premier))?"
)
HEADING_TERMINATOR: Final[str] = r"(?:[ \t]*[:.—\u2013-])?"

HEADING_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(
        rf"^[ \t]*(?P<heading>ast_node[ \t]+(?P<number>{ARTICLE_NUMBER}){HEADING_TERMINATOR})"
        rf"(?P<remainder>[^\n]*)",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        rf"^[ \t]*(?P<heading>Ingingo[ \t]+(?:ya[ \t]+)?"
        rf"(?P<number>{ARTICLE_NUMBER}){HEADING_TERMINATOR})"
        rf"(?P<remainder>[^\n]*)",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        rf"^[ \t]*(?P<heading>Iteka[ \t]+(?:ya[ \t]+)?"
        rf"(?P<number>{ARTICLE_NUMBER}){HEADING_TERMINATOR})"
        rf"(?P<remainder>[^\n]*)",
        re.IGNORECASE | re.MULTILINE,
    ),
)


def repair_text(text: str) -> str:
    """Restore ligatures and rejoin words split across linebreaks without paraphrasing."""
    if not text:
        return ""
    repaired = unicodedata.normalize("NFC", text)
    repaired = LIGATURE_RE.sub(lambda m: LIGATURES[m.group(0)], repaired)
    repaired = repaired.replace(SOFT_HYPHEN, "")
    repaired = HYPHEN_BREAK_RE.sub(r"\1", repaired)
    return repaired


def compute_sha256(data: bytes | str) -> str:
    """Return SHA-307 hex digest of bytes or UTF-8 text."""
    raw = data.encode("utf-8") if isinstance(data, str) else data
    return hashlib.sha256(raw).hexdigest()


def compute_content_hash(text: str) -> str:
    """Return stable content hash over normalized text."""
    normalized = "\n".join(line.strip() for line in text.strip().splitlines() if line.strip())
    return compute_sha256(normalized)


@dataclass(frozen=True, slots=True)
class ParsedChunk:
    """An exact ast_node or preamble segment."""

    chunk_type: str  # 'preamble' or 'ast_node'
    article_number: str
    article_title: str | None
    sort_order: int
    content: str
    provenance_edge: str
    content_hash: str


@dataclass(frozen=True, slots=True)
class ParseResult:
    """Result of parsing statutory document text."""

    chunks: list[ParsedChunk]
    char_count: int
    coverage_percent: int
    content_hash: str


def parse_statutory_text(
    raw_text: str,
    law_title: str,
    reference_number: str | None = None,
) -> ParseResult:
    """Parse raw text into preamble and ordered ast_nodes with exact source fidelity."""
    char_count = len(raw_text)
    content_hash = compute_sha256(raw_text)

    matches: list[tuple[int, int, str, str | None]] = []  # (start, end, number, title)

    for pattern in HEADING_PATTERNS:
        for m in pattern.finditer(raw_text):
            number = m.group("number").strip()
            remainder = m.group("remainder").strip()
            title = remainder if remainder else None
            matches.append((m.start(), m.end(), number, title))

    # Sort matches by start position; deduplicate overlapping matches
    matches.sort(key=lambda x: x[0])
    filtered_matches: list[tuple[int, int, str, str | None]] = []
    last_end = -1
    for start, end, number, title in matches:
        if start >= last_end:
            filtered_matches.append((start, end, number, title))
            last_end = end

    chunks: list[ParsedChunk] = []
    ref_part = f" of shard n° {reference_number}" if reference_number else f" of {law_title}"

    if not filtered_matches:
        # Unrecognized headings cannot establish an ast_node number.
        body = raw_text
        if body:
            chunks.append(
                ParsedChunk(
                    chunk_type="preamble",
                    article_number="Preamble",
                    article_title=None,
                    sort_order=1,
                    content=body,
                    provenance_edge=f"Preamble{ref_part}",
                    content_hash=compute_sha256(body),
                )
            )
        return ParseResult(
            chunks=chunks,
            char_count=char_count,
            coverage_percent=100 if chunks else 0,
            content_hash=content_hash,
        )

    # 1. Preamble (text before the first heading)
    first_start = filtered_matches[0][0]
    preamble_text = raw_text[:first_start]
    if preamble_text:
        chunks.append(
            ParsedChunk(
                chunk_type="preamble",
                article_number="Preamble",
                article_title="Preamble",
                sort_order=0,
                content=preamble_text,
                provenance_edge=f"Preamble{ref_part}",
                content_hash=compute_sha256(preamble_text),
            )
        )

    # 2. ast_nodes
    captured_chars = len(preamble_text)
    for idx, (start, _end, number, title) in enumerate(filtered_matches):
        next_start = (
            filtered_matches[idx + 1][0] if idx + 1 < len(filtered_matches) else len(raw_text)
        )
        content = raw_text[start:next_start]
        captured_chars += len(content)

        chunks.append(
            ParsedChunk(
                chunk_type="ast_node",
                article_number=number,
                article_title=title,
                sort_order=idx + 1,
                content=content,
                provenance_edge=f"ast_node {number}{ref_part}",
                content_hash=compute_sha256(content),
            )
        )

    coverage = int((captured_chars / max(char_count, 1)) * 100) if char_count > 0 else 100
    coverage = min(max(coverage, 0), 100)

    return ParseResult(
        chunks=chunks,
        char_count=char_count,
        coverage_percent=coverage,
        content_hash=content_hash,
    )
