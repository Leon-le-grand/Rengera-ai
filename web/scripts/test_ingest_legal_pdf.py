#!/usr/bin/env python3
"""Regression tests for scripts/ingest_legal_pdf.py.

Each test reproduces text that the previous parser lost, so a regression is
caught without needing a real PDF or a pdfplumber install.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ingest_legal_pdf import (  # noqa: E402
    article_sort_key,
    build_coverage_report,
    find_headings,
    repair_text,
    split_legal_text,
)

LAW = {
    "law_id": "law_test",
    "document_title": "Law N° 001/2024",
    "category": "Labour Law",
    "language": "english",
}


def chunk_map(chunks):
    return {chunk["article_number"]: chunk for chunk in chunks}


def test_preamble_is_preserved() -> bool:
    """Text before Article 1 was silently discarded by the old parser."""
    text = (
        "LAW N° 001/2024 OF 05/01/2024\n"
        "Published in the Official Gazette on 10/01/2024\n\n"
        "Article 1\n"
        "Purpose of the law.\n\n"
        "Article 2\n"
        "Scope of application.\n"
    )

    chunks = split_legal_text(text=text, **LAW)
    preamble = [chunk for chunk in chunks if chunk["chunk_type"] == "preamble"]

    ok = len(preamble) == 1
    ok = ok and "LAW N° 001/2024" in preamble[0]["content"]
    ok = ok and "Official Gazette" in preamble[0]["content"]
    ok = ok and len(chunk_map(chunks)) == 3  # preamble + Article 1 + Article 2
    print("preamble preserved:", ok)
    return ok


def test_mixed_language_headings() -> bool:
    """The old parser matched one language only, merging later articles."""
    text = (
        "Article 1\n"
        "English heading.\n\n"
        "Ingingo ya 2\n"
        "Umusarangi w'umukene.\n\n"
        "Article 3\n"
        "Another English heading.\n\n"
        "Iteka ya 4\n"
        "Amategeko.\n"
    )

    chunks = split_legal_text(text=text, **LAW)
    articles = {chunk["article_number"] for chunk in chunks if chunk["chunk_type"] == "article"}

    ok = articles == {"1", "2", "3", "4"}
    ok = ok and all(chunk["chunk_type"] == "article" for chunk in chunks if chunk["chunk_type"] == "article")
    print("mixed-language headings:", ok)
    return ok


def test_nonnumeric_article_numbers() -> bool:
    """`int()` on '5ter' or '5.2' used to crash or collapse articles."""
    text = (
        "Article 1\nFirst.\n\n"
        "Article 5 ter\nInserted article.\n\n"
        "Article 5 bis\nAnother inserted article.\n\n"
        "Article 12.3\nDecimal numbering.\n"
    )

    chunks = split_legal_text(text=text, **LAW)
    articles = {chunk["article_number"] for chunk in chunks if chunk["chunk_type"] == "article"}

    ok = articles == {"1", "5 ter", "5 bis", "12.3"}
    ok = ok and len([chunk for chunk in chunks if chunk["chunk_type"] == "article"]) == 4
    print("non-numeric article numbers:", ok)
    return ok


def test_article_sorting_is_natural() -> bool:
    # Numeric order first, then repeated numbers in statutory order:
    # 5, then 5 bis (second occurrence), then 5 ter (third occurrence).
    numbers = ["10", "2", "5 ter", "5 bis", "12.3", "12"]
    ordered = sorted(numbers, key=article_sort_key)
    ok = ordered == ["2", "5 bis", "5 ter", "10", "12", "12.3"]
    print("natural article ordering:", ok)
    return ok


def test_heading_inside_paragraph_is_not_a_boundary() -> bool:
    """A citation mid-paragraph must not split an article in half."""
    text = (
        "Article 1\n"
        "This article amends Article 5 of Law N° 66/2018 and continues here.\n\n"
        "Article 2\n"
        "Second article.\n"
    )

    chunks = split_legal_text(text=text, **LAW)
    articles = [chunk for chunk in chunks if chunk["chunk_type"] == "article"]

    ok = len(articles) == 2
    ok = ok and "continues here" in articles[0]["content"]
    print("inline citation is not a boundary:", ok)
    return ok


def test_no_headings_keeps_full_text() -> bool:
    """A document with no recognised heading must still be fully retained."""
    text = "Icyakubiri\n\nUnyiruko rwose rw'umwandiko.\n"

    chunks = split_legal_text(text=text, **LAW)
    ok = len(chunks) == 1 and chunks[0]["chunk_type"] == "preamble"
    ok = ok and "Unyiruko rwose" in chunks[0]["content"]
    print("unheaded document retained:", ok)
    return ok


def test_ligature_and_hyphen_repair() -> bool:
    """Ligatures and line-broken words must be searchable again."""
    text = "The ﬁnal employer must pay over\u00adtime.\nemploy-\nment rules"

    repaired = repair_text(text)
    ok = "final" in repaired
    ok = ok and "\u00ad" not in repaired
    ok = ok and "employment" in repaired
    print("ligature and hyphen repair:", ok)
    return ok


def test_coverage_is_one_hundred_percent() -> bool:
    """Every readable character must land in exactly one chunk."""
    text = (
        "HEADER TITLE\n"
        "Preamble sentence.\n\n"
        "Article 1\nFirst body.\n\n"
        "Article 2\nSecond body.\n"
    )

    chunks = split_legal_text(text=text, **LAW)
    raw_readable = sum(1 for char in text if not char.isspace())
    captured = sum(1 for chunk in chunks for char in chunk["content"] if not char.isspace())

    report = build_coverage_report(chunks, text, [{"page": 1, "characters": raw_readable, "readable": True}], 1)
    ok = report["coverage_percent"] == 100.0
    ok = ok and captured == raw_readable
    print("coverage is 100%:", ok)
    return ok


def test_duplicate_articles_are_reported() -> bool:
    """Repeating an article number is legal in amending laws and must be flagged."""
    text = (
        "Article 1\nFirst version.\n\n"
        "Article 1\nAmended version.\n"
    )

    chunks = split_legal_text(text=text, **LAW)
    report = build_coverage_report(chunks, text, [{"page": 1, "characters": 10, "readable": True}], 1)
    ok = report["duplicate_article_numbers"] == ["1"]
    ok = ok and len([chunk for chunk in chunks if chunk["chunk_type"] == "article"]) == 2
    print("duplicate articles flagged:", ok)
    return ok


def test_no_duplicate_heading_offsets() -> bool:
    """Overlapping patterns must not emit the same span twice."""
    text = "Article 5 bis\nInserted.\n\nIngingo ya 5 bis\nIgiyeongezwe.\n"
    matches = find_headings(text)
    ok = len(matches) == len({match.start() for match in matches})
    print("heading offsets unique:", ok)
    return ok


def main() -> int:
    tests = [
        test_preamble_is_preserved,
        test_mixed_language_headings,
        test_nonnumeric_article_numbers,
        test_article_sorting_is_natural,
        test_heading_inside_paragraph_is_not_a_boundary,
        test_no_headings_keeps_full_text,
        test_ligature_and_hyphen_repair,
        test_coverage_is_one_hundred_percent,
        test_duplicate_articles_are_reported,
        test_no_duplicate_heading_offsets,
    ]

    failures = [test.__name__ for test in tests if not test()]

    print()
    if failures:
        print(f"FAILED {len(failures)}/{len(tests)}: {', '.join(failures)}")
        return 1

    print(f"All {len(tests)} parser tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())