"""Urgent guidance works without a session, database, or provider."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.routes.safety import router


def test_safety_check_never_needs_storage() -> None:
    app = FastAPI()
    app.include_router(router, prefix="/v1")
    with TestClient(app) as client:
        for language in ("en", "rw", "fr"):
            response = client.post(
                "/v1/safety/check", json={"question": "I am bleeding", "language": language}
            )
            assert response.status_code == 200
            assert response.json()["urgent"] is True
            assert response.json()["saved"] is False
            assert response.json()["emergency"]["contacts"]
        assert client.post("/v1/safety/check", json={"question": "hello"}).json()["urgent"] is False
