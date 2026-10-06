#!/usr/bin/env python3
"""Triage RLRC-crawled PDFs: keep real laws, quarantine non-law documents.

Inspects each PDF's content (first pages of text + PDF metadata), not just the
filename. Confident non-laws (action plans, annual reports, newsletters,
internal rules, speeches, tenders...) are MOVED to a quarantine directory so
nothing is deleted. A JSON report records every decision with reasons.

Usage:
    python3 scripts/triage_rlrc_pdfs.py \
        --pdf-dir ./data/rlrc/pdfs \
        --quarantine ./data/rlrc/quarantine \
        --report ./data/rlrc/triage_report.json
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import shutil
import sys
from pathlib import Path

LOGGER = logging.getLogger("rengera.triage")

# Real content patterns of legislation (first pages).
# Note: Kinyarwanda headings use the "Ingingo ya 5" form, not "Ingingo 5".
LAW_RES = [
    r"(?mi)^[ \t]*(article|ingingo|iteka)(\s+ya)?\s+\d+",
    r"(?i)law\s*n[°ºo]?\s*\d{1,4}/\d{4}",
    r"(?i)itegeko\s*n[°ºo]?",
    r"(?i)official\s+gazette|journal\s+officiel|igazeti",
    r"(?i)pursuant\s+to\s+the\s+constitution|vu\s+la\s+constitution",
    r"(?i)the\s+parliament\s+has\s+adopted|inteko\s+rusange",
]

# Strong filename signals of non-law documents.
NONLAW_FILENAME_RES = [
    r"action.?plan",
    r"annual.?report",
    r"activity.?report",
    r"strategic.?plan",
    r"newsletter",
    r"bulletin",
    r"magazine",
    r"brochure",
    r"internal.?rules",
    r"yearbook",
    r"\bspeech\b",
    r"press.?release",
    r"tender",
    r"vacancy",
    r"job.?advert",
    r"procurement",
    r"training.?manual",
    r"presentation",
    r"workshop",
    r"seminar",
    r"imihigo",
    r"performance.?contract",
]

NONLAW_CONTENT_RES = [
    r"(?i)action\s+plan\s+\d{4}",
    r"(?i)annual\s+(activity\s+)?report",
    r"(?i)strategic\s+plan",
    r"(?i)newsletter|news\s+letter",
    r"(?i)internal\s+rules\s+of",
    r"(?i)tender\s+notice|invitation\s+to\s+tender",
    r"(?i)job\s+vacancy|vacancy\s+announcement",
    r"(?i)press\s+release",
    r"(?i)keynote\s+address|opening\s+remarks|closing\s+remarks",
]


def extract_head_text(pdf_path: Path, max_pages: int = 3, max_chars: int = 6000) -> tuple[str, dict]:
    """Fast text sample: first pages only, plain extraction (no tables)."""
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError("pdfplumber is required: pip install -r scripts/requirements-legal-ingest.txt")

    meta: dict = {}
    parts: list[str] = []
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            meta = {str(k): str(v)[:200] for k, v in (pdf.metadata or {}).items()}
            for page in pdf.pages[:max_pages]:
                try:
                    text = page.extract_text() or ""
                except Exception:
                    text = ""
                if text.strip():
                    parts.append(text)
                if sum(len(p) for p in parts) >= max_chars:
                    break
    except Exception as exc:
        return "", {"error": str(exc)[:200]}

    return "\n".join(parts)[:max_chars], meta


def score_text(text: str) -> tuple[int, int, list[str], list[str]]:
    law_hits: list[str] = []
    nonlaw_hits: list[str] = []
    for pattern in LAW_RES:
        try:
            if re.search(pattern, text):
                law_hits.append(pattern[:40])
        except re.error:
            continue
    for pattern in NONLAW_CONTENT_RES:
        try:
            if re.search(pattern, text):
                nonlaw_hits.append(pattern[:40])
        except re.error:
            continue
    # Article-heading density is the strongest law signal (ya-form included).
    headings = len(re.findall(r"(?mi)^[ \t]*(article|ingingo|iteka)(\s+ya)?\s+\d+", text))
    return len(law_hits), len(nonlaw_hits), law_hits, nonlaw_hits, headings


def triage_one(pdf_path: Path) -> dict:
    name = pdf_path.name.lower()
    filename_nonlaw = [p for p in NONLAW_FILENAME_RES if re.search(p, name)]

    text, meta = extract_head_text(pdf_path)
    if not text.strip():
        return {
            "file": pdf_path.name,
            "size": pdf_path.stat().st_size,
            "decision": "keep",
            "reason": "no extractable text in first pages — needs OCR, kept for admin review",
            "filename_signals": filename_nonlaw,
            "meta": meta,
        }

    law_n, nonlaw_n, law_hits, nonlaw_hits, headings = score_text(text)

    has_gazette = any('gazette' in h or 'igazeti' in h for h in law_hits)
    # An Official Gazette document with article headings is legislation, even
    # if its first pages mention reports or plans (e.g. annual-report tables
    # inside a gazette issue). Never quarantine those.
    if has_gazette and headings > 0:
        return {
            "file": pdf_path.name,
            "size": pdf_path.stat().st_size,
            "decision": "keep",
            "reason": f"gazette + {headings} article headings — legislation despite any other signals",
            "filename_signals": filename_nonlaw,
            "meta": meta,
        }

    if nonlaw_n >= 1 and (headings == 0 or nonlaw_n > law_n):
        return {
            "file": pdf_path.name,
            "size": pdf_path.stat().st_size,
            "decision": "quarantine",
            "reason": f"non-law content signals ({nonlaw_n}): {', '.join(nonlaw_hits[:3])}; article headings: {headings}",
            "filename_signals": filename_nonlaw,
            "meta": meta,
        }
    if filename_nonlaw and headings == 0 and law_n == 0:
        return {
            "file": pdf_path.name,
            "size": pdf_path.stat().st_size,
            "decision": "quarantine",
            "reason": f"non-law filename ({', '.join(filename_nonlaw)}) and no legal content found",
            "filename_signals": filename_nonlaw,
            "meta": meta,
        }
    return {
        "file": pdf_path.name,
        "size": pdf_path.stat().st_size,
        "decision": "keep",
        "reason": f"legal content signals ({law_n}), article headings: {headings}",
        "filename_signals": filename_nonlaw,
        "meta": meta,
    }


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Quarantine non-law PDFs from the RLRC crawl.")
    parser.add_argument("--pdf-dir", type=Path, default=Path("data/rlrc/pdfs"))
    parser.add_argument("--quarantine", type=Path, default=Path("data/rlrc/quarantine"))
    parser.add_argument("--report", type=Path, default=Path("data/rlrc/triage_report.json"))
    args = parser.parse_args(argv)

    pdfs = sorted(args.pdf_dir.glob("*.pdf"))
    if not pdfs:
        LOGGER.error("No PDFs in %s", args.pdf_dir)
        return 1

    args.quarantine.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    kept = quarantined = 0

    for index, pdf in enumerate(pdfs, start=1):
        result = triage_one(pdf)
        results.append(result)
        if result["decision"] == "quarantine":
            dest = args.quarantine / pdf.name
            counter = 2
            while dest.exists():
                dest = args.quarantine / f"{pdf.stem}-{counter}.pdf"
                counter += 1
            shutil.move(str(pdf), str(dest))
            result["moved_to"] = str(dest.relative_to(args.quarantine.parent))
            quarantined += 1
        else:
            kept += 1
        if index % 25 == 0:
            LOGGER.info("Triaged %s/%s — kept %s, quarantined %s", index, len(pdfs), kept, quarantined)

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    LOGGER.info("Done: %s kept, %s quarantined, report at %s", kept, quarantined, args.report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
