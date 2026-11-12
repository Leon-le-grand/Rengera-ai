"""Database writes use the language labels required by the SQL schema."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import uuid4

import pytest

from app.repositories.laws import PostgresLawRepository


class RecordingDatabase:
    def __init__(self) -> None:
        self.law_args: tuple[object, ...] | None = None
        self.article_args: list[tuple[object, ...]] = []

    async def fetchrow(self, _query: str, *args: object) -> dict[str, Any]:
        self.law_args = args
        return {
            "id": str(args[0]),
            "title": args[1],
            "reference_number": args[2],
            "gazette_reference": args[3],
            "status": args[4],
            "type": args[5],
            "publication_date": args[6],
            "effective_date": args[7],
            "language": args[8],
            "languages_available": args[9],
            "summary": args[10],
            "source_url": args[11],
            "content_hash": args[13],
            "source_pdf_sha256": args[14],
            "extraction_coverage_percent": args[15],
            "extraction_char_count": args[16],
            "needs_ocr": args[17],
            "reviewed_at": None,
            "reviewed_by": None,
            "created_at": None,
            "category": None,
            "article_count": 0,
        }

    async def execute(self, _query: str, *args: object) -> None:
        self.article_args.append(args)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("api_language", "stored_language"),
    [("en", "english"), ("rw", "kinyarwanda"), ("fr", "french")],
)
async def test_law_and_article_writes_map_supported_language_codes(
    api_language: str, stored_language: str
) -> None:
    database = RecordingDatabase()
    repository = PostgresLawRepository(database)  # type: ignore[arg-type]
    law_id = uuid4()

    await repository.insert_law(
        law_id=law_id,
        title="A statutory text",
        publication_date=date(2024, 1, 1),
        language=api_language,
        languages_available=[api_language],
        raw_content="Article 1: Source text.",
    )
    await repository.insert_articles(
        [
            (
                uuid4(),
                law_id,
                "A statutory text",
                None,
                "1",
                None,
                "article",
                1,
                api_language,
                "Source text.",
                "hash",
                "A statutory text, Article 1",
                None,
            )
        ]
    )

    assert database.law_args is not None
    assert database.law_args[8] == stored_language
    assert database.law_args[9] == [stored_language]
    assert database.article_args[0][8] == stored_language


@pytest.mark.asyncio
async def test_law_write_defaults_availability_to_its_language() -> None:
    database = RecordingDatabase()
    repository = PostgresLawRepository(database)  # type: ignore[arg-type]

    await repository.insert_law(
        law_id=uuid4(),
        title="A statutory text",
        language="rw",
        raw_content="Article 1: Source text.",
    )

    assert database.law_args is not None
    assert database.law_args[8] == "kinyarwanda"
    assert database.law_args[9] == ["kinyarwanda"]


@pytest.mark.asyncio
async def test_article_write_rejects_missing_language_before_database_call() -> None:
    database = RecordingDatabase()
    repository = PostgresLawRepository(database)  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="Article language is required"):
        await repository.insert_articles(
            [
                (
                    uuid4(),
                    uuid4(),
                    "A statutory text",
                    None,
                    "1",
                    None,
                    "article",
                    1,
                    "en",
                    "Source text.",
                    "hash",
                    "A statutory text, Article 1",
                    None,
                ),
                (
                    uuid4(),
                    uuid4(),
                    "A statutory text",
                    None,
                    "1",
                    None,
                    "article",
                    1,
                    None,
                    "Source text.",
                    "hash",
                    "A statutory text, Article 1",
                    None,
                )
            ]
        )

    assert database.article_args == []
