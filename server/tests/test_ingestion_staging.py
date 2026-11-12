"""Focused tests for the production ingestion staging repository."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any
from uuid import uuid4

import pytest

from app.api.v1.schemas.admin import LawIngestRequest
from app.repositories.ingestion_staging import (
    DuplicateStageError,
    IngestionStagingRepository,
)


class DuplicateConnection:
    @asynccontextmanager
    async def transaction(self):
        yield self

    async def fetchval(self, _query: str, *_args: object) -> bool:
        return True


class DuplicateDatabase:
    def __init__(self) -> None:
        self.connection = DuplicateConnection()

    @asynccontextmanager
    async def acquire(self):
        yield self.connection


class CountingClassifier:
    def __init__(self) -> None:
        self.calls = 0

    async def complete(self, *_args: Any, **_kwargs: Any) -> str:
        self.calls += 1
        return '{"category":"General","summary":"A proposal."}'


@pytest.mark.asyncio
async def test_duplicate_source_is_rejected_before_classifier_call() -> None:
    classifier = CountingClassifier()
    repository = IngestionStagingRepository(DuplicateDatabase(), classifier)
    request = LawIngestRequest(
        title="A statutory text",
        raw_content="Article 1: This is a sufficiently long statutory source.",
    )

    with pytest.raises(DuplicateStageError):
        await repository.stage(request, account_id=uuid4())

    assert classifier.calls == 0
