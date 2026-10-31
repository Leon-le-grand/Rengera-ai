"""Contract stability tests for the exported OpenAPI document."""

from __future__ import annotations

from openapi_spec_validator import validate as validate_openapi

from scripts.export_openapi import (
    SCHEMA_PATH,
    build_schema,
    render_schema,
    validate_operation_ids,
)


def test_expected_paths_and_operation_ids_are_present() -> None:
    schema = build_schema()

    assert set(schema["paths"]) == {
        "/health/live",
        "/health/ready",
        "/v1/meta",
        "/v1/session",
        "/v1/me",
        "/v1/laws",
        "/v1/laws/{law_id}",
        "/v1/laws/{law_id}/articles/{article_number}",
        "/v1/answers",
    }
    operation_ids = [
        operation["operationId"]
        for path_item in schema["paths"].values()
        for method, operation in path_item.items()
        if method in {"get", "post", "put", "patch", "delete"}
    ]
    assert sorted(operation_ids) == [
        "createAnswer",
        "createSession",
        "deleteSession",
        "getCurrentAccount",
        "getHealthLive",
        "getHealthReady",
        "getLaw",
        "getLawArticle",
        "getMeta",
        "getSession",
        "listLaws",
    ]


def test_operation_ids_are_unique() -> None:
    validate_operation_ids(build_schema())


def test_contract_is_a_valid_openapi_document() -> None:
    validate_openapi(build_schema())


def test_schema_export_is_deterministic() -> None:
    assert render_schema() == render_schema()


def test_committed_contract_matches_application() -> None:
    assert SCHEMA_PATH.exists(), "run `uv run python -m scripts.export_openapi`"
    assert SCHEMA_PATH.read_text(encoding="utf-8") == render_schema()


def test_error_envelope_is_part_of_the_contract() -> None:
    schema = build_schema()
    components = schema["components"]["schemas"]

    assert "ErrorResponse" in components
    assert "ErrorBody" in components
    error_body = components["ErrorBody"]
    assert set(error_body["required"]) == {"code", "message", "request_id"}
