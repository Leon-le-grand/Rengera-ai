"""Database-free app and fixture wiring for the law-reader test suite."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import FakeChatProvider, FakeLawRepository

from app.api.v1.routes import answers, laws
from app.core.settings import Settings


@pytest.fixture()
def repository() -> FakeLawRepository:
    return FakeLawRepository()


@pytest.fixture()
def provider() -> FakeChatProvider:
    return FakeChatProvider()


@pytest.fixture()
def api_app(
    settings: Settings,
    repository: FakeLawRepository,
    provider: FakeChatProvider,
) -> FastAPI:
    app = FastAPI()
    app.state.settings = settings
    app.state.law_repository = repository
    app.state.chat_provider = provider
    app.include_router(laws.router, prefix="/v1")
    app.include_router(answers.router, prefix="/v1")
    return app


@pytest.fixture()
def api_client(api_app: FastAPI) -> Iterator[TestClient]:
    with TestClient(api_app) as client:
        yield client
