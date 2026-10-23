#!/usr/bin/env python3
"""Download Official Gazette issues (Igazeti ya Leta) from MINIJUST.

Source: https://www.minijust.gov.rw/official-gazette (TYPO3 tx_filelist).

The site classifies gazettes as YEAR -> MONTH, e.g.
    2026 Igazeti ya Leta / UKWAKIRA-October-Octobre / <issue PDFs>
This script mirrors that classification on disk:

    data/igazeti/2026_Igazeti_ya_Leta/10_UKWAKIRA-October-Octobre/<issue>.pdf

Plus manifest.json (URL, year, month, title, size, hash, local path) and a
human-readable tree.md. Same conservative rules as the RLRC crawler: same-host
links only, robots.txt honored, rate-limited requests, SHA-256 dedup.

Typical scoped run (validate first, then go wide):

    python3 scripts/download_igazeti_gazettes.py --dry-run --years 2026 --months 10
    python3 scripts/download_igazeti_gazettes.py --years 2026
    python3 scripts/download_igazeti_gazettes.py   # everything, 2017-2026
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

LOGGER = logging.getLogger("rengera.igazeti")
DEFAULT_START_URL = "https://www.minijust.gov.rw/official-gazette"
DEFAULT_USER_AGENT = "RengeraLegalIndexer/1.0 (public legal research; contact via site administrator)"

# Trilingual month folders, e.g. "UKWAKIRA-October-Octobre".
MONTH_NUMBERS = {
    "mutarama": "01", "january": "01", "janvier": "01",
    "gashyantare": "02", "february": "02", "fevrier": "02",
    "werurwe": "03", "march": "03", "mars": "03",
    "mata": "04", "april": "04", "avril": "04",
    "gicurasi": "05", "may": "05", "mai": "05",
    "kamena": "06", "june": "06", "juin": "06",
    "nyakanga": "07", "july": "07", "juillet": "07",
    "kanama": "08", "august": "08", "aout": "08",
    "nzeri": "09", "september": "09", "septembre": "09",
    "ukwakira": "10", "october": "10", "octobre": "10",
    "ugushyingo": "11", "november": "11", "novembre": "11",
    "ukuboza": "12", "december": "12", "decembre": "12",
}


@dataclass
class GazetteFile:
    url: str
    year: str
    month: str
    year_title: str
    month_title: str
    title: str
    size_info: str
    modified: str
    sha256: str | None = None
    local_path: str | None = None


def clean_part(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-.")
    return cleaned or "untitled"


def year_from_title(title: str) -> str | None:
    match = re.search(r"(19|20)\d{2}", title)
    return match.group(0) if match else None


def month_number(title: str) -> str | None:
    lowered = title.lower()
    for name, number in MONTH_NUMBERS.items():
        if name in lowered:
            return number
    return None


def local_dir(base: Path, year_title: str, month_title: str) -> Path:
    year = year_from_title(year_title) or "unknown-year"
    cleaned_year = clean_part(year_title)
    year_dir = cleaned_year if cleaned_year.startswith(year) else f"{year}_{cleaned_year}"
    if not month_title:
        return base / year_dir  # older years have no month level
    number = month_number(month_title)
    month_dir = f"{number}_{clean_part(month_title)}" if number else clean_part(month_title)
    return base / year_dir / month_dir


def split_crumbs(page_crumbs: list[str]) -> tuple[str, str]:
    """Split breadcrumb into (year_title, month_title).

    Year pages show Documents / YEAR (no month level for older years);
    month pages show Documents / YEAR / MONTH.
    """
    tail = [c for c in page_crumbs if c.lower() != "documents"]
    if not tail:
        return "", ""
    if len(tail) == 1:
        return (tail[0], "") if year_from_title(tail[0]) else ("", tail[0])
    return tail[-2], tail[-1]


class IgazetiDownloader:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.output = Path(args.output).resolve()
        self.output.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": args.user_agent})
        self.host = (urlparse(args.start_url).hostname or "").lower()
        self.robots = self._load_robots()
        self._last_request_at = 0.0
        self.visited_pages: set[str] = set()
        self.seen_hashes: dict[str, str] = {}
        self.files: list[GazetteFile] = []

    def _load_robots(self) -> RobotFileParser | None:
        try:
            url = f"https://{self.host}/robots.txt"
            response = self.session.get(url, timeout=self.args.timeout)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            parser = RobotFileParser()
            parser.set_url(url)
            parser.parse(response.text.splitlines())
            return parser
        except requests.RequestException as exc:
            LOGGER.warning("Could not read robots.txt (%s); continuing without it.", exc)
            return None

    def _wait(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < self.args.delay:
            time.sleep(self.args.delay - elapsed)
        self._last_request_at = time.monotonic()

    def _get(self, url: str) -> requests.Response | None:
        if self.robots is not None and not self.robots.can_fetch(self.args.user_agent, url):
            LOGGER.info("Blocked by robots.txt: %s", url)
            return None
        self._wait()
        try:
            response = self.session.get(url, timeout=self.args.timeout)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            LOGGER.warning("Request failed for %s: %s", url, exc)
            return None

    def _soup(self, url: str) -> BeautifulSoup | None:
        response = self._get(url)
        if response is None:
            return None
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type:
            return None
        return BeautifulSoup(response.text, "html.parser")

    @staticmethod
    def _breadcrumb(soup: BeautifulSoup) -> list[str]:
        crumbs: list[str] = []
        for item in soup.select("ol.breadcrumb li"):
            text = " ".join(item.get_text(" ", strip=True).split())
            if text and text != "..":
                crumbs.append(text)
        return crumbs

    def _table_rows(self, soup: BeautifulSoup, page_url: str) -> tuple[list[str], list[dict]]:
        """Split a filelist table into folder links and file rows."""
        folders: list[str] = []
        files: list[dict] = []
        table = soup.select_one("div.tx-filelist table.table")
        if table is None:
            return folders, files

        for row in table.select("tbody tr"):
            anchors = row.select("a[href]")
            if not anchors:
                continue
            first_href = urljoin(page_url, anchors[0].get("href", ""))
            first_img = anchors[0].select_one("img")
            img_src = first_img.get("src", "") if first_img else ""

            if "move_up_thumbnail" in img_src:
                continue  # parent ".." link: never follow upward
            if "folder_thumbnail" in img_src:
                folders.append(first_href)
                continue

            title_link = anchors[-1]
            title = " ".join(title_link.get_text(" ", strip=True).split())
            file_href = urljoin(page_url, title_link.get("href", ""))
            cells = [" ".join(td.get_text(" ", strip=True).split()) for td in row.select("td")]
            size_info = next((c for c in cells if re.search(r"\d+\s*(KB|MB|GB|bytes)", c, re.I)), "")
            modified = next((c for c in cells if re.search(r"\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec", c)), "")
            files.append({"url": file_href, "title": title, "size_info": size_info, "modified": modified})

        return folders, files

    def _pager_links(self, soup: BeautifulSoup, page_url: str, folder_path: str) -> list[str]:
        """Next pages of the same folder listing only (same filelist path)."""
        links: list[str] = []
        for anchor in soup.select("ul.f3-widget-paginator a[href]"):
            href = urljoin(page_url, anchor.get("href", ""))
            if "tx_filelist_filelist" not in href:
                continue
            # Pager links for other folders carry a different path: skip those.
            if folder_path and folder_path not in href and "currentPage" in href:
                continue
            links.append(href)
        return links

    def _resolve_file_url(self, file_url: str) -> str | None:
        """File rows usually link straight at the PDF; otherwise probe one level.

        Never reads a response body here: headers alone decide, so multi-MB
        gazette issues are not downloaded just to check what they are.
        """
        if file_url.lower().endswith(".pdf"):
            return file_url
        if self.args.dry_run:
            return file_url
        if self.robots is not None and not self.robots.can_fetch(self.args.user_agent, file_url):
            return None
        self._wait()
        try:
            with self.session.get(file_url, timeout=self.args.timeout, stream=True) as response:
                response.raise_for_status()
                content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                if content_type == "application/pdf":
                    return response.url
                if "text/html" not in content_type:
                    return None
                chunks: list[bytes] = []
                size = 0
                for chunk in response.iter_content(chunk_size=65536):
                    chunks.append(chunk)
                    size += len(chunk)
                    if size > 1_000_000:  # detail pages are small; stop early
                        break
                soup = BeautifulSoup(b"".join(chunks).decode("utf-8", "ignore"), "html.parser")
        except requests.RequestException as exc:
            LOGGER.warning("Probe failed for %s: %s", file_url, exc)
            return None
        except Exception as exc:  # noqa: BLE001 - malformed pages must not stop the run.
            LOGGER.warning("Probe parse failed for %s: %s", file_url, exc)
            return None
        for anchor in soup.select("a[href]"):
            href = urljoin(file_url, str(anchor.get("href") or ""))
            if href.lower().endswith(".pdf") and (urlparse(href).hostname or "").lower() == self.host:
                return href
        return None

    def _download(self, entry: GazetteFile) -> bool:
        if entry.sha256 is not None:
            return True
        response = self._get(entry.url)
        if response is None:
            return False
        content = response.content
        if not content.startswith(b"%PDF"):
            LOGGER.warning("Not a PDF, skipped: %s", entry.url)
            return False

        digest = hashlib.sha256(content).hexdigest()
        if digest in self.seen_hashes:
            LOGGER.info("Duplicate content skipped: %s", entry.title[:80])
            entry.sha256 = digest
            entry.local_path = self.seen_hashes[digest]
            return True

        target_dir = local_dir(self.output, entry.year_title, entry.month_title)
        target_dir.mkdir(parents=True, exist_ok=True)
        remote_name = Path(urlparse(entry.url).path).name or "gazette.pdf"
        filename = clean_part(Path(remote_name).stem) + ".pdf"
        target = target_dir / filename
        counter = 2
        while target.exists():
            target = target_dir / f"{target.stem}-{counter}.pdf"
            counter += 1
        target.write_bytes(content)
        relative = str(target.relative_to(self.output))
        self.seen_hashes[digest] = relative
        entry.sha256 = digest
        entry.local_path = relative
        LOGGER.info("Saved %s (%s bytes)", relative, len(content))
        return True

    def _crawl_folder(self, folder_url: str, crumbs: list[str], depth: int) -> None:
        """Recurse year -> month folders; download files found in month folders."""
        to_visit = [folder_url]
        folder_path = ""
        match = re.search(r"tx_filelist_filelist%5Bpath%5D=([^&]*)", folder_url)
        if match:
            from urllib.parse import unquote

            folder_path = unquote(match.group(1))

        while to_visit:
            page_url = to_visit.pop(0)
            if page_url in self.visited_pages:
                continue
            self.visited_pages.add(page_url)

            soup = self._soup(page_url)
            if soup is None:
                continue

            page_crumbs = self._breadcrumb(soup) or crumbs
            folders, files = self._table_rows(soup, page_url)

            for sub in folders:
                if sub not in self.visited_pages and depth < self.args.max_depth:
                    self._crawl_folder(sub, page_crumbs, depth + 1)

            for item in files:
                if self.args.max_files and len(self.files) >= self.args.max_files:
                    return
                year_title, month_title = split_crumbs(page_crumbs)
                if not self._wanted(year_title, month_title):
                    continue
                resolved = self._resolve_file_url(item["url"])
                if resolved is None:
                    LOGGER.warning("No PDF behind row: %s", item["title"][:80])
                    continue
                entry = GazetteFile(
                    url=resolved,
                    year=year_from_title(year_title) or "",
                    month=month_number(month_title) or "",
                    year_title=year_title,
                    month_title=month_title,
                    title=item["title"],
                    size_info=item["size_info"],
                    modified=item["modified"],
                )
                if self.args.dry_run:
                    self.files.append(entry)
                    LOGGER.info("FOUND [%s / %s] %s", year_title, month_title, entry.title[:100])
                    continue
                if self._download(entry):
                    self.files.append(entry)

            for nxt in self._pager_links(soup, page_url, folder_path):
                if nxt not in self.visited_pages and nxt not in to_visit:
                    to_visit.append(nxt)

    def _wanted(self, year_title: str, month_title: str) -> bool:
        if self.args.years:
            year = year_from_title(year_title)
            if year not in self.args.years:
                return False
        if self.args.months:
            number = month_number(month_title)
            if number not in self.args.months:
                return False
        return True

    def run(self) -> None:
        self._load_existing_manifest()
        soup = self._soup(self.args.start_url)
        if soup is None:
            LOGGER.error("Could not load the gazette index. Aborting.")
            return
        folders, _ = self._table_rows(soup, self.args.start_url)
        for sub in self._pager_links(soup, self.args.start_url, ""):
            folders.append(sub)
        LOGGER.info("Found %s year folders.", len(folders))
        for folder in folders:
            self._crawl_folder(folder, [], 1)
        self.write_outputs()

    def _load_existing_manifest(self) -> None:
        """Resume support: keep prior entries so gap-fill runs merge, and skip
        URLs whose files are already on disk (verified by SHA-256)."""
        path = self.output / "manifest.json"
        if not path.is_file():
            return
        try:
            previous = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            LOGGER.warning("Could not read existing manifest: %s", exc)
            return
        kept = 0
        for item in previous:
            local = item.get("local_path")
            full = self.output / local if local else None
            if not local or full is None or not full.is_file():
                continue
            try:
                digest = hashlib.sha256(full.read_bytes()).hexdigest()
            except OSError:
                continue
            if digest != item.get("sha256"):
                continue  # changed on disk: re-download below
            self.seen_hashes[digest] = local
            self.files.append(GazetteFile(**{k: item.get(k) for k in GazetteFile.__dataclass_fields__}))
            kept += 1
        if kept:
            LOGGER.info("Resumed: %s already-downloaded issues kept from manifest.", kept)

    def write_outputs(self) -> None:
        (self.output / "manifest.json").write_text(
            json.dumps([asdict(f) for f in self.files], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        lines = ["# Igazeti ya Leta — download tree", ""]
        by_year: dict[str, dict[str, list[GazetteFile]]] = {}
        for entry in self.files:
            by_year.setdefault(entry.year_title or "unknown", {}).setdefault(
                entry.month_title or "unknown", []
            ).append(entry)
        for year in sorted(by_year):
            months = by_year[year]
            total = sum(len(v) for v in months.values())
            lines.append(f"- {year} ({total} issues)")
            for month in sorted(months, key=lambda m: (month_number(m) or "99", m)):
                lines.append(f"  - {month} ({len(months[month])} issues)")
                for entry in months[month]:
                    marker = "" if entry.local_path else " [not downloaded]"
                    lines.append(f"    - {entry.title[:110]}{marker}")
        (self.output / "tree.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        LOGGER.info(
            "Done: %s issues recorded%s in %s",
            len(self.files),
            "" if self.args.dry_run else ", downloaded",
            self.output,
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Download MINIJUST Official Gazette issues, classified by year and month."
    )
    parser.add_argument("--start-url", default=DEFAULT_START_URL)
    parser.add_argument("--output", default="data/igazeti")
    parser.add_argument("--years", default=None, help="Comma list, e.g. 2025,2026. Omit for all years.")
    parser.add_argument("--months", default=None, help="Comma month numbers 01-12. Omit for all months.")
    parser.add_argument("--max-depth", type=int, default=3)
    parser.add_argument("--max-files", type=int, default=0, help="Stop after N files (0 = no limit).")
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds between requests.")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--user-agent", default=DEFAULT_USER_AGENT)
    parser.add_argument("--dry-run", action="store_true", help="List what would download, fetch nothing.")
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    args.years = [y.strip() for y in args.years.split(",")] if args.years else []
    args.months = [m.strip().zfill(2) for m in args.months.split(",")] if args.months else []

    downloader = IgazetiDownloader(args)
    downloader.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
