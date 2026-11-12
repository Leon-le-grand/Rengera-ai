"""Health, readiness and metadata contract tests."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.readiness import CheckResult, CheckStatus


def test_liveness_returns_ok(client: TestClient) -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {"status": "ok"}


def test_readiness_reports_only_implemented_checks(client: TestClient) -> None:
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {"config": {"status": "ok", "detail": None}},
    }


def test_readiness_returns_503_when_a_check_is_unavailable(app: FastAPI) -> None:
    async def unavailable() -> CheckResult:
        return CheckResult(status=CheckStatus.UNAVAILABLE, detail="dependency missing")

    app.state.readiness.register("later-module", unavailable)
    with TestClient(app) as client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "unavailable"
    assert body["checks"]["later-module"]["status"] == "unavailable"
    assert body["checks"]["config"]["status"] == "ok"


def test_meta_reports_version_languages_and_implemented_capabilities(
    client: TestClient,
) -> None:
    response = client.get("/v1/meta")
    assert response.status_code == 200
    assert response.json() == {
        "api_version": "v1",
        "app_version": "0.1.0",
        "supported_answer_languages": ["en", "rw", "fr"],
        "capabilities": ["health", "meta", "session", "laws", "answers"],
    }
