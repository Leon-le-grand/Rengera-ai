"""Request ID propagation tests."""

from __future__ import annotations

from uuid import UUID

from fastapi.testclient import TestClient


def _is_uuid4_hex(value: str) -> bool:
    return len(value) == 32 and UUID(value).version == 4


def test_generates_request_id_when_absent(client: TestClient) -> None:
    response = client.get("/health/live")
    request_id = response.headers["X-Request-ID"]
    assert _is_uuid4_hex(request_id)


def test_reuses_sane_incoming_request_id(client: TestClient) -> None:
    response = client.get("/health/live", headers={"X-Request-ID": "client-request-0001"})
    assert response.headers["X-Request-ID"] == "client-request-0001"


def test_replaces_malformed_incoming_request_id(client: TestClient) -> None:
    response = client.get("/health/live", headers={"X-Request-ID": "not a valid id"})
    request_id = response.headers["X-Request-ID"]
    assert request_id != "not a valid id"
    assert _is_uuid4_hex(request_id)


def test_replaces_overlong_incoming_request_id(client: TestClient) -> None:
    response = client.get("/health/live", headers={"X-Request-ID": "a" * 200})
    request_id = response.headers["X-Request-ID"]
    assert request_id != "a" * 200
    assert _is_uuid4_hex(request_id)


def test_error_envelope_and_header_share_request_id(client: TestClient) -> None:
    response = client.get(
        "/v1/does-not-exist",
        headers={"X-Request-ID": "error-request-0001"},
    )
    assert response.status_code == 404
    assert response.headers["X-Request-ID"] == "error-request-0001"
    assert response.json()["error"]["request_id"] == "error-request-0001"
