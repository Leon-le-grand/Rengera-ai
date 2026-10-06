#!/usr/bin/env python3
"""Strict-fidelity ingestion of official Rwandan legal PDFs.

The parser never summarizes, rewrites, or summarizes-away statutory text. It
extracts the text reported by pdfplumber, then splits it only where a recognised
Article or Ingingo heading occurs. Each output chunk contains the exact article
text plus metadata suitable for filtering, citation, deduplication, and
embedding.

COVERAGE DESIGN
The previous implementation lost text in three ways, all now fixed:

1. Text appearing before the first article heading (the law title, gazette
   line, preamble, and any recitals) was silently discarded. It is now emitted
   as a ``preamble`` chunk with ``chunk_type = "preamble"``.
2. Only the heading style of ``--language`` was matched, so a document that
   mixed ``Article 5`` and ``Ingingo ya 5`` lost every boundary it did not
   recognise. All styles are now matched regardless of the declared language.
3. ``page.extract_text()`` alone drops table cells and multi-column layout. Each
   page is now extracted with several strategies and the richest result wins.

Every run also emits a coverage report so you can prove how much of the file
was captured rather than assuming it. See ``--report``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Iterable, Sequence

LOGGER = logging.getLogger("rengera.legal_ingest")
SUPPORTED_LANGUAGES = ("kinyarwanda", "english", "french")

# ---------------------------------------------------------------------------
# Character repair
# ---------------------------------------------------------------------------
# PDF text layers routinely store ligatures and soft hyphens as single code
# points. Expanding them restores characters that were present in the printed
# law; it does not paraphrase anything. Disable with --no-repair.
LIGATURES = {
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
LIGATURE_RE = re.compile("|".join(LIGATURES))
SOFT_HYPHEN = "\u00ad"

# A word broken across a line end keeps its hyphen in the PDF text layer.
# "employ-\nment" must become "employment", otherwise full-text search misses it.
HYPHEN_BREAK_RE = re.compile(r"(\w)[-\u2010\u2011\u2012]\n(?=\w)")

# An article number is kept as a string: legal numbering is not always an
# integer. "5", "5ter", "5 bis", "5.2" all occur in Rwandan legislation.
ARTICLE_NUMBER = r"\d+(?:\.\d+)?(?:[ \t]*(?:er|re|ter|e|eme|ème|bis|deuxième|premier))?"
HEADING_TERMINATOR = r"(?:[ \t]*[:.—–-])?"

# Every recognised heading style is matched regardless of --language so a
# trilingual document keeps all of its boundaries.
HEADING_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        rf"^[ \t]*(?P<heading>Article[ \t]+(?P<number>{ARTICLE_NUMBER}){HEADING_TERMINATOR})"
        rf"(?P<remainder>[^\n]*)",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        rf"^[ \t]*(?P<heading>Ingingo[ \t]+(?:ya[ \t]+)?(?P<number>{ARTICLE_NUMBER}){HEADING_TERMINATOR})"
        rf"(?P<remainder>[^\n]*)",
        re.IGNORECASE | re.MULTILINE,
    ),
    re.compile(
        rf"^[ \t]*(?P<heading>Iteka[ \t]+(?:ya[ \t]+)?(?P<number>{ARTICLE_NUMBER}){HEADING_TERMINATOR})"
        rf"(?P<remainder>[^\n]*)",
        re.IGNORECASE | re.MULTILINE,
    ),
)

Chunk = dict[str, Any]
PageStat = dict[str, Any]


def repair_text(text: str) -> str:
    """Restore ligatures and rejoin words split across a line break."""
    if not text:
        return text

    repaired = LIGATURE_RE.sub(lambda match: LIGATURES[match.group(0)], text)
    repaired = repaired.replace(SOFT_HYPHEN, "")
    repaired = unicodedata.normalize("NFC", repaired)
    repaired = HYPHEN_BREAK_RE.sub(r"\1", repaired)
    return repaired


def repair_cell(cell: str) -> str:
    """Repair a table cell while preserving its internal line breaks."""
    if not cell:
        return ""

    cleaned = unicodedata.normalize("NFC", cell.replace("\n", " ").replace(SOFT_HYPHEN, ""))
    cleaned = LIGATURE_RE.sub(lambda match: LIGATURES[match.group(0)], cleaned)
    return re.sub(r"[ \t]{2,}", " ", cleaned).strip()


def normalize_language(language: str) -> str:
    """Validate and normalize the language label used in output metadata."""
    normalized = language.strip().lower()
    if normalized not in SUPPORTED_LANGUAGES:
        allowed = ", ".join(SUPPORTED_LANGUAGES)
        raise ValueError(f"Unsupported language {language!r}. Use one of: {allowed}.")
    return normalized


def _table_text(page: Any) -> str:
    """Render page tables as pipe-separated rows so their text is searchable."""
    try:
        tables = page.extract_tables() or []
    except Exception as exc:  # noqa: BLE001 - a bad table must not abort ingestion.
        LOGGER.debug("Table extraction failed: %s", exc)
        return ""

    lines: list[str] = []
    for table in tables:
        for row in table:
            cells = [repair_cell(cell or "") for cell in row]
            cells = [cell for cell in cells if cell]
            if cells:
                lines.append(" | ".join(cells))

    return "\n".join(lines)


def _extract_page(page: Any, repair: bool) -> str:
    """Return the richest readable text for one page.

    Three strategies are tried because each loses something different:
    ``extract_text`` keeps reading order but flattens tables, ``layout=True``
    preserves columns but adds spacing, and ``extract_tables`` recovers cells
    that both of the above can interleave incorrectly.
    """
    candidates: list[str] = []

    for kwargs in ({"layout": False}, {"layout": True}):
        try:
            text = page.extract_text(**kwargs) or ""
        except Exception as exc:  # noqa: BLE001 - one strategy may fail.
            LOGGER.debug("extract_text(%s) failed: %s", kwargs, exc)
            text = ""
        if text.strip():
            candidates.append(text)

    tables = _table_text(page)
    if tables.strip():
        candidates.append(tables)

    if not candidates:
        return ""

    # A layout extraction pads heavily with spaces; compare on real characters
    # so padding never wins just because it is longer.
    def readable_length(value: str) -> int:
        return sum(1 for char in value if not char.isspace())

    best = max(candidates, key=readable_length)
    return repair_text(best) if repair else best


def _ocr_page(pdf_path: Path, page_number: int, language: str = "kin+eng+fra") -> str:
    """OCR one page with Tesseract. Returns "" when OCR is unavailable.

    Optional dependencies (install only when needed):
        pip install pdf2image pytesseract pillow
    plus system packages: tesseract-ocr, tesseract-ocr-kin, poppler-utils.
    Never raises: OCR is a fallback, not a requirement.
    """
    try:
        from pdf2image import convert_from_path
        import pytesseract
        from PIL import Image  # noqa: F401 - ensures pillow is present.
    except ImportError:
        LOGGER.warning(
            "OCR requested but pdf2image/pytesseract are not installed. "
            "Install with: pip install pdf2image pytesseract pillow"
        )
        return ""

    try:
        images = convert_from_path(str(pdf_path), first_page=page_number, last_page=page_number, dpi=300)
    except Exception as exc:  # noqa: BLE001 - poppler may be missing.
        LOGGER.warning("OCR rendering failed for page %s: %s", page_number, exc)
        return ""

    if not images:
        return ""

    try:
        return pytesseract.image_to_string(images[0], lang=language) or ""
    except Exception as exc:  # noqa: BLE001 - tesseract may lack the language pack.
        LOGGER.warning("OCR failed for page %s: %s", page_number, exc)
        return ""


def extract_pdf_text(
    pdf_path: Path,
    repair: bool = True,
    ocr: bool = False,
    ocr_language: str = "kin+eng+fra",
) -> tuple[str, list[PageStat]]:
    """Extract page text and per-page statistics without aborting on a bad page."""
    try:
        import pdfplumber
    except ImportError as exc:  # pragma: no cover - depends on the environment.
        raise RuntimeError(
            "pdfplumber is required. Install it with: pip install -r scripts/requirements-legal-ingest.txt"
        ) from exc

    page_texts: list[str] = []
    page_stats: list[PageStat] = []
    total_pages = 0

    with pdfplumber.open(str(pdf_path)) as pdf:
        total_pages = len(pdf.pages)
        if not total_pages:
            LOGGER.warning("PDF %s contains no pages.", pdf_path)
            return "", page_stats

        for page_number, page in enumerate(pdf.pages, start=1):
            try:
                text = _extract_page(page, repair)
            except Exception as exc:  # noqa: BLE001 - one bad page must not abort ingestion.
                LOGGER.warning("Could not extract page %s: %s", page_number, exc)
                text = ""

            # Scanned page: no text layer. With --ocr, fall back to Tesseract.
            if not text.strip() and ocr:
                ocr_text = _ocr_page(pdf_path, page_number, ocr_language)
                if ocr_text.strip():
                    LOGGER.info("Page %s recovered via OCR (%s chars).", page_number, len(ocr_text))
                    text = ocr_text

            characters = sum(1 for char in text if not char.isspace())
            page_stats.append(
                {
                    "page": page_number,
                    "characters": characters,
                    "readable": bool(text.strip()),
                }
            )

            if not text.strip():
                LOGGER.warning("Page %s produced no readable text.", page_number)
                continue

            # A blank line preserves a page boundary without changing the text
            # returned for any individual page.
            page_texts.append(text)

    if not page_texts:
        LOGGER.warning("No readable pages were extracted from %s.", pdf_path)
        return "", page_stats

    return "\n\n".join(page_texts), page_stats


def find_headings(text: str) -> list[re.Match[str]]:
    """Return every article boundary in document order, across all heading styles."""
    matches: list[re.Match[str]] = []
    for pattern in HEADING_PATTERNS:
        matches.extend(pattern.finditer(text))

    # finditer does not overlap within one pattern, but two different patterns
    # can match the same span. Deduplicate by start offset, then order.
    unique: dict[int, re.Match[str]] = {}
    for match in matches:
        current = unique.get(match.start())
        if current is None or len(match.group("heading")) > len(current.group("heading")):
            unique[match.start()] = match

    return [unique[offset] for offset in sorted(unique)]


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


def normalize_article_number(raw: str) -> str:
    """Collapse internal whitespace so `Article 5 bis` and `Article 5bis` agree."""
    return re.sub(r"[ \t]+", " ", raw.strip())


def article_sort_key(raw: str) -> tuple[int, int, str]:
    """Order articles naturally: numeric part, then any suffix."""
    match = re.match(r"^(\d+)(?:\.(\d+))?", raw)
    if not match:
        return (0, 0, raw.lower())

    major = int(match.group(1))
    minor = int(match.group(2) or 0)
    return (major, minor, raw.lower())


def content_hash(law_id: str, article_number: str, content: str) -> str:
    """Create a stable deduplication hash for one article chunk."""
    payload = f"{law_id}:{article_number}:{content}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def build_chunk(
    law_id: str,
    document_title: str,
    category: str,
    language: str,
    article_number: str,
    article_title: str | None,
    content: str,
    chunk_type: str,
    page_hint: int | None = None,
) -> Chunk:
    return {
        "law_id": law_id,
        "document_title": document_title,
        "category": category,
        "chunk_type": chunk_type,
        "article_number": article_number,
        "article_title": article_title,
        "language": language,
        "page": page_hint,
        "content": content,
        "content_hash": content_hash(law_id, article_number, content),
    }


def split_legal_text(
    text: str,
    law_id: str,
    document_title: str,
    category: str,
    language: str,
) -> list[Chunk]:
    """Split already-extracted text at legal article boundaries.

    Any text before the first heading is preserved as a preamble chunk rather
    than discarded, so no part of the source file is lost.
    """
    normalized_language = normalize_language(language)
    matches = find_headings(text)

    if not matches:
        LOGGER.warning(
            "No article headings were found. The document may be scanned or "
            "use an unrecognised heading style. The full text is preserved as a "
            "single preamble chunk so nothing is lost."
        )
        stripped = text.strip()
        if not stripped:
            return []
        return [
            build_chunk(
                law_id,
                document_title,
                category,
                normalized_language,
                "preamble",
                None,
                stripped,
                "preamble",
            )
        ]

    chunks: list[Chunk] = []

    preamble = text[: matches[0].start()].strip()
    if preamble:
        LOGGER.info("Preserved %s characters of preamble text.", len(preamble))
        chunks.append(
            build_chunk(
                law_id,
                document_title,
                category,
                normalized_language,
                "preamble",
                None,
                preamble,
                "preamble",
            )
        )

    for index, match in enumerate(matches):
        article_number = normalize_article_number(match.group("number"))
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)

        # strip() removes only extraction whitespace at the outer boundaries; no
        # words, punctuation, or statutory language are changed.
        content = text[start:end].strip()
        if not content:
            LOGGER.warning("Article %s is empty and was skipped.", article_number)
            continue

        chunks.append(
            build_chunk(
                law_id,
                document_title,
                category,
                normalized_language,
                article_number,
                detect_article_title(match.group("remainder")),
                content,
                "article",
            )
        )

    LOGGER.info("Created %s chunks (%s articles) from %s.",
                len(chunks), len(matches), law_id)
    return chunks


def build_coverage_report(
    chunks: Sequence[Chunk],
    raw_text: str,
    page_stats: Sequence[PageStat],
    total_pages: int,
) -> dict[str, Any]:
    """Measure how much of the source file actually reached the chunks."""
    raw_readable = sum(1 for char in raw_text if not char.isspace())
    captured_readable = sum(
        1 for chunk in chunks for char in chunk["content"] if not char.isspace()
    )

    articles = [chunk for chunk in chunks if chunk["chunk_type"] == "article"]
    numbers = sorted(
        {chunk["article_number"] for chunk in articles}, key=article_sort_key
    )

    unreadable_pages = [stat["page"] for stat in page_stats if not stat["readable"]]
    duplicate_articles = sorted(
        number
        for number in numbers
        if sum(1 for chunk in articles if chunk["article_number"] == number) > 1
    )

    coverage = (captured_readable / raw_readable * 100) if raw_readable else 0.0

    return {
        "total_pages": total_pages,
        "readable_pages": len(page_stats) - len(unreadable_pages),
        "unreadable_pages": unreadable_pages,
        "source_characters": raw_readable,
        "captured_characters": captured_readable,
        "coverage_percent": round(coverage, 2),
        "chunk_count": len(chunks),
        "article_count": len(articles),
        "preamble_chunks": len(chunks) - len(articles),
        "first_article": numbers[0] if numbers else None,
        "last_article": numbers[-1] if numbers else None,
        "duplicate_article_numbers": duplicate_articles,
        "per_page": list(page_stats),
    }


def parse_legal_pdf(
    pdf_path: str | Path,
    law_id: str,
    document_title: str,
    category: str,
    language: str,
    repair: bool = True,
    ocr: bool = False,
) -> tuple[list[Chunk], dict[str, Any]]:
    """Parse a legal PDF and return article chunks plus a coverage report.

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
    extracted_text, page_stats = extract_pdf_text(path, repair=repair, ocr=ocr)

    if not extracted_text.strip():
        report = build_coverage_report([], extracted_text, page_stats, len(page_stats))
        return [], report

    chunks = split_legal_text(
        text=extracted_text,
        law_id=law_id.strip(),
        document_title=document_title.strip(),
        category=category.strip(),
        language=normalized_language,
    )

    report = build_coverage_report(chunks, extracted_text, page_stats, len(page_stats))
    return chunks, report


def write_chunks(chunks: Sequence[Chunk], output_path: str | Path) -> None:
    """Write UTF-8 JSON without escaping Kinyarwanda characters."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(list(chunks), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def summarize_report(report: dict[str, Any]) -> str:
    """Render a short human-readable coverage summary for the terminal."""
    lines = [
        "pages: {readable}/{total} readable".format(
            readable=report["readable_pages"], total=report["total_pages"]
        ),
        "coverage: {coverage}% of {source} characters".format(
            coverage=report["coverage_percent"], source=report["source_characters"]
        ),
        "chunks: {chunks} ({articles} articles + {preamble} preamble)".format(
            chunks=report["chunk_count"],
            articles=report["article_count"],
            preamble=report["preamble_chunks"],
        ),
    ]

    if report["first_article"]:
        lines.append(
            "articles: {first} .. {last}".format(
                first=report["first_article"], last=report["last_article"]
            )
        )

    if report["unreadable_pages"]:
        lines.append(
            "WARNING unreadable pages: {}".format(
                ", ".join(str(page) for page in report["unreadable_pages"])
            )
        )
    if report["duplicate_article_numbers"]:
        lines.append(
            "WARNING duplicate article numbers: {}".format(
                ", ".join(report["duplicate_article_numbers"])
            )
        )

    return "\n".join(lines)


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
        help="Primary language of the document. Headings in every language are still detected.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output JSON path. Use '-' or omit to write JSON to stdout.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="Write the coverage report as JSON to this path.",
    )
    parser.add_argument(
        "--min-coverage",
        type=float,
        default=0.0,
        help="Exit non-zero when coverage falls below this percentage. 99 is a useful target.",
    )
    parser.add_argument(
        "--no-repair",
        action="store_true",
        help="Keep ligatures, soft hyphens, and hyphenated line breaks exactly as extracted.",
    )
    parser.add_argument(
        "--ocr",
        action="store_true",
        help="OCR pages with no text layer via Tesseract (needs pdf2image, pytesseract, tesseract-ocr).",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    args = build_argument_parser().parse_args(argv)

    try:
        chunks, report = parse_legal_pdf(
            pdf_path=args.pdf_path,
            law_id=args.law_id,
            document_title=args.document_title,
            category=args.category,
            language=args.language,
            repair=not args.no_repair,
            ocr=args.ocr,
        )
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        LOGGER.error("Ingestion failed: %s", exc)
        return 1

    LOGGER.info("Coverage summary:\n%s", summarize_report(report))

    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        LOGGER.info("Wrote coverage report to %s.", args.report)

    if not chunks:
        LOGGER.warning("No chunks were produced; no output was written.")
        return 2

    if args.output and str(args.output) != "-":
        write_chunks(chunks, args.output)
        LOGGER.info("Wrote %s chunks to %s.", len(chunks), args.output)
    else:
        json.dump(chunks, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")

    if args.min_coverage and report["coverage_percent"] < args.min_coverage:
        LOGGER.error(
            "Coverage %.2f%% is below the required %.2f%%.",
            report["coverage_percent"],
            args.min_coverage,
        )
        return 3

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
