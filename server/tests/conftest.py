"""Shared fixtures for API tests."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import create_app


@pytest.fixture()
def settings() -> Settings:
    """Explicit test settings; never inherit values from the developer environment."""
    return Settings(
        app_env="test",
        app_name="Rengera AI API",
        app_version="0.1.0",
        app_url="http://testserver",
        allowed_origins="http://localhost:5173",
        log_level="INFO",
        request_id_header="X-Request-ID",
        _env_file=None,
    )


@pytest.fixture()
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture()
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
