"""Redaction and access-log privacy tests."""

from __future__ import annotations

import json
import logging

from fastapi.testclient import TestClient

from app.core.logging import JsonFormatter, redact


def test_redact_removes_nested_secret_keys() -> None:
    payload = {
        "authorization": "Bearer abc",
        "Cookie": "session=abc",
        "nested": {
            "password": "hunter2",
            "api_key": "key-123",
            "safe": "visible",
        },
        "items": [{"token": "t-1", "secret_value": "s-1"}],
    }

    cleaned = redact(payload)

    assert cleaned["authorization"] == "[REDACTED]"
    assert cleaned["Cookie"] == "[REDACTED]"
    assert cleaned["nested"]["password"] == "[REDACTED]"
    assert cleaned["nested"]["api_key"] == "[REDACTED]"
    assert cleaned["nested"]["safe"] == "visible"
    assert cleaned["items"][0]["token"] == "[REDACTED]"
    assert cleaned["items"][0]["secret_value"] == "[REDACTED]"


def test_json_formatter_redacts_sensitive_extra_fields() -> None:
    record = logging.LogRecord(
        name="app.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="test event",
        args=(),
        exc_info=None,
    )
    record.authorization = "Bearer must-not-appear"
    record.cookie = "session=must-not-appear"
    record.safe_field = "visible"

    rendered = json.loads(JsonFormatter().format(record))

    assert rendered["authorization"] == "[REDACTED]"
    assert rendered["cookie"] == "[REDACTED]"
    assert rendered["safe_field"] == "visible"
    assert "must-not-appear" not in json.dumps(rendered)


def test_access_log_never_contains_query_string_or_headers(
    client: TestClient,
    caplog,
) -> None:
    caplog.set_level(logging.INFO, logger="app.access")

    response = client.get(
        "/v1/meta?question=my-private-legal-question",
        headers={"Authorization": "Bearer must-not-appear"},
    )

    assert response.status_code == 200
    access_records = [
        record.getMessage() for record in caplog.records if record.name == "app.access"
    ]
    assert access_records
    access_text = "\n".join(access_records)
    assert "my-private-legal-question" not in access_text
    assert "must-not-appear" not in access_text
    assert "/v1/meta" in access_text


def test_access_log_replaces_path_parameters(app, caplog) -> None:
    @app.get("/v1/test/{item_id}")
    async def item(item_id: str) -> dict[str, str]:
        return {"id": item_id}

    caplog.set_level(logging.INFO, logger="app.access")
    with TestClient(app) as client:
        response = client.get("/v1/test/private-id-123")

    assert response.status_code == 200
    access_text = "\n".join(
        record.getMessage() for record in caplog.records if record.name == "app.access"
    )
    assert "{item_id}" in access_text
    assert "private-id-123" not in access_text
