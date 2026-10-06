#!/usr/bin/env python3
"""Discover and download legal documents published on the RLRC website.

The crawler is intentionally conservative: same-host links only, robots.txt is
honored, requests are rate-limited, and every discovered page/PDF is recorded
in a manifest and tree so the result is auditable and repeatable.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
import sys
import time
from collections import defaultdict, deque
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

LOGGER = logging.getLogger("rengera.rlrc_crawler")
DEFAULT_START_URL = "https://www.rlrc.gov.rw/"
DEFAULT_USER_AGENT = "RengeraLegalIndexer/1.0 (public legal research; contact via site administrator)"
SKIP_SCHEMES = {"mailto", "javascript", "tel", "data"}


@dataclass
class CrawlNode:
    url: str
    title: str
    depth: int
    parent: str | None
    category_path: list[str] = field(default_factory=list)
    content_type: str | None = None
    is_pdf: bool = False
    local_path: str | None = None
    sha256: str | None = None
    children: set[str] = field(default_factory=set)


class RlrcCrawler:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.output = Path(args.output).resolve()
        self.pdf_dir = self.output / "pdfs"
        self.output.mkdir(parents=True, exist_ok=True)
        self.pdf_dir.mkdir(parents=True, exist_ok=True)

        self.session = requests.Session()
        self.session.headers.update({"User-Agent": args.user_agent})
        self.allowed_hosts = {
            (urlparse(host).hostname or host).lower().lstrip(".")
            for host in (
                args.allowed_host
                or [(urlparse(url).hostname or "") for url in args.start_url]
            )
            if host
        }
        self.nodes: dict[str, CrawlNode] = {}
        self.discovered_pdf_urls: set[str] = set()
        self.content_hashes: dict[str, str] = {}
        self.robots = self._load_robots(urlparse(args.start_url[0]).scheme + "://" + urlparse(args.start_url[0]).netloc + "/robots.txt")
        self._last_request_at = 0.0

    def _load_robots(self, robots_url: str) -> RobotFileParser | None:
        if self.args.ignore_robots:
            return None
        try:
            response = self.session.get(robots_url, timeout=self.args.timeout)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            parser = RobotFileParser()
            parser.set_url(robots_url)
            parser.parse(response.text.splitlines())
            return parser
        except requests.RequestException as exc:
            LOGGER.warning("Could not read robots.txt (%s); continuing without it.", exc)
            return None

    def _wait_for_rate_limit(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < self.args.delay:
            time.sleep(self.args.delay - elapsed)
        self._last_request_at = time.monotonic()

    def _can_fetch(self, url: str) -> bool:
        if self.robots is None:
            return True
        return self.robots.can_fetch(self.args.user_agent, url)

    def _normalize_url(self, url: str) -> str:
        parsed = urlparse(url)
        scheme = parsed.scheme.lower()
        host = (parsed.hostname or "").lower()
        port = f":{parsed.port}" if parsed.port else ""
        path = re.sub(r"/{2,}", "/", parsed.path or "/")
        query = urlencode(sorted(parse_qsl(parsed.query, keep_blank_values=True)))
        return urlunparse((scheme, f"{host}{port}", path, "", query, ""))

    def _in_scope(self, url: str) -> bool:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            return False
        host = (parsed.hostname or "").lower()
        if not any(host == allowed or host.endswith(f".{allowed}") for allowed in self.allowed_hosts):
            return False
        if self.args.include_regex and not re.search(self.args.include_regex, url, re.IGNORECASE):
            return False
        return True

    def _category_path(self, parent: CrawlNode | None, link_text: str, url: str) -> list[str]:
        if parent is None:
            return [link_text.strip() or urlparse(url).path.strip("/") or "home"]
        path = list(parent.category_path)
        if link_text.strip():
            path.append(link_text.strip())
        return path

    def _safe_filename(self, url: str, content_type: str | None) -> str:
        parsed = urlparse(url)
        name = Path(parsed.path).name
        if not name or "." not in name:
            name = f"document-{hashlib.sha256(url.encode()).hexdigest()[:12]}"
        if not name.lower().endswith(".pdf"):
            name = f"{name}.pdf"
        cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-.")
        return cleaned or f"document-{hashlib.sha256(url.encode()).hexdigest()[:12]}.pdf"

    def _download_pdf(self, response: requests.Response, url: str, node: CrawlNode) -> None:
        content = response.content
        digest = hashlib.sha256(content).hexdigest()
        if digest in self.content_hashes:
            LOGGER.info("Duplicate PDF content skipped: %s", url)
            node.sha256 = digest
            node.local_path = self.content_hashes[digest]
            return

        filename = self._safe_filename(url, response.headers.get("content-type"))
        target = self.pdf_dir / filename
        counter = 2
        while target.exists():
            target = self.pdf_dir / f"{target.stem}-{counter}.pdf"
            counter += 1
        target.write_bytes(content)
        relative_path = str(target.relative_to(self.output))
        self.content_hashes[digest] = relative_path
        node.sha256 = digest
        node.local_path = relative_path
        LOGGER.info("Downloaded %s (%s bytes)", url, len(content))

    def _extract_links(self, response: requests.Response, page_url: str) -> list[tuple[str, str]]:
        try:
            soup = BeautifulSoup(response.text, "html.parser")
        except Exception as exc:  # noqa: BLE001 - malformed pages must not stop the crawl.
            LOGGER.warning("Could not parse HTML at %s: %s", page_url, exc)
            return []

        links: list[tuple[str, str]] = []
        for anchor in soup.find_all("a", href=True):
            href = str(anchor.get("href") or "").strip()
            if not href or href.startswith("#"):
                continue
            absolute = self._normalize_url(urljoin(page_url, href))
            if urlparse(absolute).scheme in SKIP_SCHEMES or not self._in_scope(absolute):
                continue
            text = " ".join(anchor.get_text(" ", strip=True).split())
            links.append((absolute, text))
        return links

    def crawl(self) -> None:
        queue: deque[tuple[str, int, str | None, str]] = deque()
        for start_url in self.args.start_url:
            normalized = self._normalize_url(start_url)
            queue.append((normalized, 0, None, "RLRC"))
            self.nodes.setdefault(
                normalized,
                CrawlNode(url=normalized, title="RLRC seed", depth=0, parent=None, category_path=["RLRC"]),
            )

        processed = 0
        while queue and processed < self.args.max_pages:
            url, depth, parent_url, link_text = queue.popleft()
            if url in self.nodes and self.nodes[url].title != "RLRC seed":
                existing = self.nodes[url]
                if parent_url and parent_url in self.nodes:
                    existing.children.add(parent_url)
                continue
            if depth > self.args.max_depth:
                LOGGER.debug("Skipping depth %s: %s", depth, url)
                continue
            if not self._can_fetch(url):
                LOGGER.info("Blocked by robots.txt: %s", url)
                continue

            self._wait_for_rate_limit()
            try:
                response = self.session.get(
                    url,
                    timeout=self.args.timeout,
                    allow_redirects=True,
                    stream=False,
                )
                response.raise_for_status()
            except requests.RequestException as exc:
                LOGGER.warning("Request failed for %s: %s", url, exc)
                continue

            processed += 1
            final_url = self._normalize_url(response.url)
            content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
            looks_like_pdf = (
                content_type == "application/pdf"
                or final_url.lower().endswith(".pdf")
                or "dumpfile" in final_url.lower()
            )
            parent = self.nodes.get(parent_url) if parent_url else None
            title = link_text or (urlparse(final_url).path.rsplit("/", 1)[-1] or urlparse(final_url).netloc)
            node = CrawlNode(
                url=final_url,
                title=title[:300],
                depth=depth,
                parent=parent_url,
                category_path=self._category_path(parent, link_text, final_url),
                content_type=content_type,
                is_pdf=looks_like_pdf,
            )
            self.nodes[final_url] = node
            if parent_url and parent_url in self.nodes:
                self.nodes[parent_url].children.add(final_url)

            if looks_like_pdf:
                self.discovered_pdf_urls.add(final_url)
                self._download_pdf(response, final_url, node)
                continue

            for link, text in self._extract_links(response, final_url):
                if link not in self.nodes:
                    queue.append((link, depth + 1, final_url, text))
                elif final_url in self.nodes:
                    self.nodes[final_url].children.add(link)

            if processed % self.args.progress_every == 0:
                LOGGER.info(
                    "Processed %s pages, queued %s, PDFs %s",
                    processed,
                    len(queue),
                    len(self.discovered_pdf_urls),
                )

    def _tree_payload(self) -> dict[str, object]:
        roots = [node.url for node in self.nodes.values() if node.parent is None]

        def build(url: str, seen: set[str]) -> dict[str, object]:
            node = self.nodes[url]
            return {
                "url": node.url,
                "title": node.title,
                "category_path": node.category_path,
                "content_type": node.content_type,
                "is_pdf": node.is_pdf,
                "local_path": node.local_path,
                "sha256": node.sha256,
                "children": [
                    build(child, seen | {url})
                    for child in sorted(node.children)
                    if child in self.nodes and child not in seen
                ],
            }

        return {"root": "RLRC", "generated_at": None, "seeds": [build(root, set()) for root in roots]}

    def write_outputs(self) -> None:
        tree = self._tree_payload()
        (self.output / "tree.json").write_text(
            json.dumps(tree, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        manifest = [asdict(self.nodes[url]) | {"children": sorted(node.children)} for url, node in sorted(self.nodes.items())]
        (self.output / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        lines = ["# RLRC discovery tree", ""]
        visited: set[str] = set()

        def render(url: str, depth: int) -> None:
            if url in visited or url not in self.nodes:
                return
            visited.add(url)
            node = self.nodes[url]
            marker = " [PDF]" if node.is_pdf else ""
            local = f" -> {node.local_path}" if node.local_path else ""
            lines.append(f"{'  ' * depth}- {node.title or node.url}{marker} ({node.url}){local}")
            for child in sorted(node.children):
                render(child, depth + 1)

        for root in tree.get("seeds", []):
            render(str(root["url"]), 0)
        (self.output / "tree.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Discover and download RLRC legal PDFs.")
    parser.add_argument("--start-url", action="append", default=None, help="Seed URL; repeat for multiple category pages.")
    parser.add_argument("--output", default="data/rlrc", help="Output directory.")
    parser.add_argument("--max-pages", type=int, default=2000)
    parser.add_argument("--max-depth", type=int, default=6)
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds between requests.")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--user-agent", default=DEFAULT_USER_AGENT)
    parser.add_argument("--allowed-host", action="append", default=None)
    parser.add_argument("--include-regex", default=None, help="Only crawl URLs matching this regex.")
    parser.add_argument("--ignore-robots", action="store_true", help="Only use if you are authorized to bypass robots.txt.")
    parser.add_argument("--progress-every", type=int, default=25)
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    if not args.start_url:
        args.start_url = [DEFAULT_START_URL]
    if args.ignore_robots:
        LOGGER.warning("robots.txt checks are disabled by --ignore-robots.")

    crawler = RlrcCrawler(args)
    crawler.crawl()
    crawler.write_outputs()
    LOGGER.info(
        "Crawl complete: %s nodes, %s PDFs, output in %s",
        len(crawler.nodes),
        len(crawler.discovered_pdf_urls),
        crawler.output,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
