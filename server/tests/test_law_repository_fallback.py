"""The development law fallback must fail honestly when no corpus is configured."""

from __future__ import annotations

import sys

from fastapi.testclient import TestClient

from app.main import create_app


def test_laws_endpoint_returns_503_without_database_or_corpus(settings, monkeypatch) -> None:
    monkeypatch.setitem(sys.modules, "app.data.sample_laws", None)
    app = create_app(settings)
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/v1/laws")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "service_unavailable"
