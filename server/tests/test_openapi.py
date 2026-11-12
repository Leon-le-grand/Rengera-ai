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
        "/v1/session/register",
        "/v1/session/refresh",
        "/v1/me",
        "/v1/laws",
        "/v1/laws/{law_id}",
        "/v1/laws/{law_id}/timeline",
        "/v1/laws/{law_id}/articles/{article_number}",
        "/v1/answers",
        "/v1/safety/check",
        "/v1/answers/{answer_id}/feedback",
        "/v1/conversations",
        "/v1/conversations/{conversation_id}",
        "/v1/conversations/{conversation_id}/messages",
        "/v1/deadlines",
        "/v1/deadlines/{deadline_id}",
        "/v1/shares",
        "/v1/shares/{share_token}",
        "/v1/alerts",
        "/v1/ussd",
        "/v1/admin/staff",
        "/v1/admin/staff/invitations",
        "/v1/admin/staff/invitations/{invitation_id}",
        "/v1/admin/staff/{account_id}/suspend",
        "/v1/admin/staff/{account_id}/reactivate",
        "/v1/admin/staff/invitations/accept",
        "/v1/admin/laws/ingest",
        "/v1/admin/laws/{law_id}/review",
        "/v1/admin/laws/{law_id}/draft",
        "/v1/admin/jobs",
        "/v1/admin/jobs/{job_id}",
        "/v1/admin/jobs/{job_id}/retry",
        "/v1/admin/ai/status",
        "/v1/admin/ai/test",
        "/v1/admin/pdfs/upload-requests",
        "/v1/admin/pdfs/{object_id}/finalize",
        "/v1/admin/pdfs/{object_id}/download",
    }
    operation_ids = [
        operation["operationId"]
        for path_item in schema["paths"].values()
        for method, operation in path_item.items()
        if method in {"get", "post", "put", "patch", "delete"}
    ]
    assert sorted(operation_ids) == [
        "acceptStaffInvitation",
        "checkUrgentSafety",
        "createAnswer",
        "createConversation",
        "createDeadline",
        "createSession",
        "createShareLink",
        "createStaffInvitation",
        "deleteConversation",
        "deleteDeadline",
        "deleteSession",
        "finalizeIngestionPdfUpload",
        "getAiProviderStatus",
        "getConversation",
        "getCurrentAccount",
        "getDeadline",
        "getHealthLive",
        "getHealthReady",
        "getIngestionJob",
        "getIngestionPdfDownloadUrl",
        "getLaw",
        "getLawArticle",
        "getLawDraft",
        "getLawTimeline",
        "getMeta",
        "getSession",
        "getSharedConsultation",
        "handleUssdCallback",
        "ingestLawDocument",
        "listConversations",
        "listDeadlines",
        "listIngestionJobs",
        "listLawAlerts",
        "listLaws",
        "listMessages",
        "listStaffInvitations",
        "listStaffMembers",
        "postMessage",
        "reactivateStaffMember",
        "refreshSession",
        "registerSession",
        "requestIngestionPdfUpload",
        "retryIngestionJob",
        "reviewLawClassification",
        "revokeStaffInvitation",
        "submitAnswerFeedback",
        "suspendStaffMember",
        "testAiProvider",
        "updateConversation",
        "updateDeadline",
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


def test_backwards_compatibility_required_schema_fields() -> None:
    """Ensure required fields on core response and request models are not removed."""
    schema = build_schema()
    schemas = schema["components"]["schemas"]

    expected_required = {
        "ErrorBody": {"code", "message", "request_id"},
        "ErrorResponse": {"error"},
        "ApiMeta": {
            "api_version",
            "app_version",
            "supported_answer_languages",
            "capabilities",
        },
        "SessionResponse": {
            "authenticated",
        },
        "CurrentAccountResponse": {"account", "capabilities"},
        "AccountSummary": {"id", "role", "status"},
        "LawListResponse": {"items", "total", "page", "page_size"},
        "LawSummaryOut": {
            "id",
            "title",
            "status",
            "type",
            "review_status",
            "needs_ocr",
            "article_count",
        },
        "LawDetailOut": {
            "id",
            "title",
            "status",
            "type",
            "review_status",
            "needs_ocr",
            "article_count",
        },
        "ArticleOut": {
            "id",
            "article_number",
            "chunk_type",
            "sort_order",
            "content",
            "citation",
        },
        "ArticleDetailOut": {
            "id",
            "article_number",
            "chunk_type",
            "sort_order",
            "content",
            "citation",
            "law_id",
            "law_title",
            "status",
        },
        "AnswerRequest": {"question", "language"},
        "AnswerResponse": {"kind", "answer", "language", "disclaimer"},
    }

    for schema_name, expected_fields in expected_required.items():
        assert schema_name in schemas, f"Schema {schema_name} is missing from contract"
        actual_fields = set(schemas[schema_name].get("required", []))
        missing = expected_fields - actual_fields
        assert not missing, f"Schema {schema_name} is missing required fields: {missing}"


def test_backwards_compatibility_standard_error_codes() -> None:
    """Ensure standard error codes are preserved."""
    schema = build_schema()
    schemas = schema["components"]["schemas"]

    assert "ErrorCode" in schemas
    error_code_enum = set(schemas["ErrorCode"]["enum"])
    expected_codes = {
        "bad_request",
        "unauthorized",
        "forbidden",
        "not_found",
        "method_not_allowed",
        "conflict",
        "payload_too_large",
        "unsupported_media_type",
        "validation_error",
        "rate_limited",
        "request_failed",
        "internal_error",
        "service_unavailable",
    }
    missing_codes = expected_codes - error_code_enum
    assert not missing_codes, f"ErrorCode enum missing standard codes: {missing_codes}"

    assert "AnswerErrorCode" in schemas
    answer_codes = set(schemas["AnswerErrorCode"]["enum"])
    expected_answer_codes = {
        "search_unavailable",
        "provider_not_configured",
        "provider_unavailable",
    }
    missing_answer_codes = expected_answer_codes - answer_codes
    assert not missing_answer_codes, f"AnswerErrorCode missing codes: {missing_answer_codes}"


def test_backwards_compatibility_answer_kinds() -> None:
    """Ensure all five documented answer kinds are preserved in the contract."""
    schema = build_schema()
    schemas = schema["components"]["schemas"]

    assert "AnswerKind" in schemas
    answer_kinds = set(schemas["AnswerKind"]["enum"])
    assert answer_kinds == {"answered", "abstained", "emergency", "greeting", "help"}


def test_no_unimplemented_future_endpoints_in_v1_contract() -> None:
    """The contract must only document implemented endpoints; no fake operations."""
    schema = build_schema()
    paths = set(schema["paths"])

    assert "/v1/upload" not in paths
    assert "/v1/workflows" not in paths
    assert "/v1/ussd" in paths

