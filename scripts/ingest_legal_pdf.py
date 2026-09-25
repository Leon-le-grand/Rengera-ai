#!/usr/bin/env python3
"""Strict-fidelity ingestion of official Rwandan legal PDFs.

The parser never summarizes or rewrites statutory text. It extracts the text
reported by pdfplumber, then splits it only where a recognised Article or
Ingingo heading occurs. Each output chunk contains the exact article text and
metadata suitable for filtering, citation, deduplication, and embedding.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any, Sequence

LOGGER = logging.getLogger("rengera.legal_ingest")
SUPPORTED_LANGUAGES = ("kinyarwanda", "english", "french")

# Article headings are matched at the beginning of a line so references inside
# a paragraph do not create false chunk boundaries.
ARTICLE_HEADING_PATTERNS: dict[str, re.Pattern[str]] = {
    "english": re.compile(
        r"^[ \t]*(?P<heading>Article[ \t]+(?P<number>\d+)(?:[ \t]*(?:er|e))?"
        r"(?:[ \t]*[:.])?)(?P<remainder>[^\n]*)",
        re.IGNORECASE | re.MULTILINE,
    ),
    "french": re.compile(
        r"^[ \t]*(?P<heading>Article[ \t]+(?P<number>\d+)(?:[ \t]*(?:er|e))?"
        r"(?:[ \t]*[:.])?)(?P<remainder>[^\n]*)",
        re.IGNORECASE | re.MULTILINE,
    ),
    "kinyarwanda": re.compile(
        r"^[ \t]*(?P<heading>Ingingo[ \t]+ya[ \t]+(?P<number>\d+)"
        r"(?:[ \t]*[:.])?)(?P<remainder>[^\n]*)",
        re.IGNORECASE | re.MULTILINE,
    ),
}

Chunk = dict[str, Any]


def normalize_language(language: str) -> str:
    """Validate and normalize the language label used in output metadata."""
    normalized = language.strip().lower()
    if normalized not in SUPPORTED_LANGUAGES:
        allowed = ", ".join(SUPPORTED_LANGUAGES)
        raise ValueError(f"Unsupported language {language!r}. Use one of: {allowed}.")
    return normalized


def extract_pdf_text(pdf_path: Path) -> str:
    """Extract page text without aborting when an individual page is unreadable."""
    try:
        import pdfplumber
    except ImportError as exc:  # pragma: no cover - depends on the environment.
        raise RuntimeError(
            "pdfplumber is required. Install it with: pip install -r scripts/requirements-legal-ingest.txt"
        ) from exc

    page_texts: list[str] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        if not pdf.pages:
            LOGGER.warning("PDF %s contains no pages.", pdf_path)
            return ""

        for page_number, page in enumerate(pdf.pages, start=1):
            try:
                text = page.extract_text() or ""
            except Exception as exc:  # noqa: BLE001 - one bad page must not abort ingestion.
                LOGGER.warning("Could not extract page %s: %s", page_number, exc)
                text = ""

            if not text.strip():
                LOGGER.warning("Page %s produced no readable text.", page_number)
                continue

            # A blank line preserves a page boundary without changing the text
            # returned for any individual page.
            page_texts.append(text)

    if not page_texts:
        LOGGER.warning("No readable pages were extracted from %s.", pdf_path)
        return ""

    return "\n\n".join(page_texts)


def detect_article_title(remainder: str) -> str | None:
    """Return a short heading title only when it is unambiguously a title.

    Statutory prose is never promoted to metadata. Long or sentence-like text
    after a heading returns ``None`` instead of guessing.
    """
    candidate = remainder.strip(" \t:.-")
    if not candidate:
        return None

    first_line = candidate.splitlines()[0].strip()
    if not first_line or len(first_line) > 120:
        return None
    if first_line.endswith((".", ";", ":", "!", "?")):
        return None
    if len(first_line.split()) > 12:
        return None
    return first_line


def content_hash(law_id: str, article_number: int, content: str) -> str:
    """Create a stable deduplication hash for one article chunk."""
    payload = f"{law_id}:{article_number}:{content}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def split_legal_text(
    text: str,
    law_id: str,
    document_title: str,
    category: str,
    language: str,
) -> list[Chunk]:
    """Split already-extracted text at legal article boundaries."""
    normalized_language = normalize_language(language)
    pattern = ARTICLE_HEADING_PATTERNS[normalized_language]
    matches = list(pattern.finditer(text))

    if not matches:
        LOGGER.warning(
            "No %s article headings were found. The document may be scanned, "
            "malformed, or in a different language.",
            normalized_language,
        )
        return []

    chunks: list[Chunk] = []
    seen_articles: set[int] = set()

    for index, match in enumerate(matches):
        article_number = int(match.group("number"))
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)

        # strip() removes only extraction whitespace at the outer boundaries; no
        # words, punctuation, or statutory language are changed.
        content = text[start:end].strip()
        if not content:
            LOGGER.warning("Article %s is empty and was skipped.", article_number)
            continue

        if article_number in seen_articles:
            LOGGER.warning("Duplicate article number %s was found; keeping both chunks.", article_number)
        seen_articles.add(article_number)

        chunks.append(
            {
                "law_id": law_id,
                "document_title": document_title,
                "category": category,
                "article_number": article_number,
                "article_title": detect_article_title(match.group("remainder")),
                "language": normalized_language,
                "content": content,
                "content_hash": content_hash(law_id, article_number, content),
            }
        )

    LOGGER.info("Created %s article chunks from %s.", len(chunks), law_id)
    return chunks


def parse_legal_pdf(
    pdf_path: str | Path,
    law_id: str,
    document_title: str,
    category: str,
    language: str,
) -> list[Chunk]:
    """Parse a legal PDF and return metadata-enriched article dictionaries.

    The returned dictionaries contain exactly the ingestion schema used by the
    Rengera RAG pipeline. Text extraction warnings are logged and do not abort
    the whole document when an individual page is unreadable.
    """
    path = Path(pdf_path)
    if not path.is_file():
        raise FileNotFoundError(f"PDF not found: {path}")
    if not law_id.strip():
        raise ValueError("law_id must not be empty.")
    if not document_title.strip():
        raise ValueError("document_title must not be empty.")
    if not category.strip():
        raise ValueError("category must not be empty.")

    normalized_language = normalize_language(language)
    extracted_text = extract_pdf_text(path)
    if not extracted_text.strip():
        return []

    return split_legal_text(
        text=extracted_text,
        law_id=law_id.strip(),
        document_title=document_title.strip(),
        category=category.strip(),
        language=normalized_language,
    )


def write_chunks(chunks: Sequence[Chunk], output_path: str | Path) -> None:
    """Write UTF-8 JSON without escaping Kinyarwanda characters."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(list(chunks), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Parse an official Rwandan legal PDF into article-level JSON chunks."
    )
    parser.add_argument("pdf_path", type=Path, help="Path to the official legal PDF.")
    parser.add_argument("--law-id", required=True, help="Stable law identifier, e.g. law_labour_66_2018.")
    parser.add_argument("--document-title", required=True, help="Full official title of the law.")
    parser.add_argument("--category", required=True, help="Legal category, e.g. Labour Law.")
    parser.add_argument(
        "--language",
        required=True,
        choices=SUPPORTED_LANGUAGES,
        help="Language of the article headings and statutory text.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output JSON path. Use '-' or omit to write JSON to stdout.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    args = build_argument_parser().parse_args(argv)

    try:
        chunks = parse_legal_pdf(
            pdf_path=args.pdf_path,
            law_id=args.law_id,
            document_title=args.document_title,
            category=args.category,
            language=args.language,
        )
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        LOGGER.error("Ingestion failed: %s", exc)
        return 1

    if not chunks:
        LOGGER.warning("No article chunks were produced; no output was written.")
        return 2

    if args.output and str(args.output) != "-":
        write_chunks(chunks, args.output)
        LOGGER.info("Wrote %s chunks to %s.", len(chunks), args.output)
    else:
        json.dump(chunks, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
