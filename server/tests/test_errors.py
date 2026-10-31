"""Error envelope behaviour across explicit, validation and unhandled failures."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.main import create_app


class SamplePayload(BaseModel):
    name: str


def test_not_found_uses_error_envelope(client: TestClient) -> None:
    response = client.get("/v1/missing")

    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "not_found"
    assert body["error"]["request_id"] == response.headers["X-Request-ID"]
    assert body["error"]["message"]


def test_method_not_allowed_uses_error_envelope(client: TestClient) -> None:
    response = client.post("/health/live")

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"


def test_validation_error_does_not_echo_submitted_values(app: FastAPI) -> None:
    @app.post("/test/validate")
    async def validate(payload: SamplePayload) -> dict[str, str]:
        return {"name": payload.name}

    with TestClient(app) as client:
        response = client.post("/test/validate", json={"name": 42})

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["details"]
    assert "42" not in str(body["error"]["details"])


def test_unhandled_exception_returns_generic_500(settings) -> None:
    test_app = create_app(settings)

    @test_app.get("/test/boom")
    async def boom() -> None:
        raise RuntimeError("secret internal detail")

    with TestClient(test_app, raise_server_exceptions=False) as client:
        response = client.get("/test/boom")

    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "internal_error"
    assert body["error"]["message"] == "An unexpected error occurred."
    assert "secret internal detail" not in response.text
    assert body["error"]["request_id"] == response.headers["X-Request-ID"]
