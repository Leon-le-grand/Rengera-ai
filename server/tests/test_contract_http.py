"""Representative HTTP contract tests across all v1 operations, error envelopes,
answer kinds, review-status honesty, and no optimistic defaults.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.health import router as health_router
from app.api.v1.routes import answers, laws, me, meta, session
from app.auth.dependencies import (
    get_account_repository,
    get_current_principal,
    get_session_rate_limiter,
    get_session_repository,
)
from app.auth.rate_limit import InMemorySessionCreationRateLimiter
from app.authorization.dependencies import get_audit_repository
from app.core.errors import register_exception_handlers
from app.core.middleware import RequestContextMiddleware
from app.core.readiness import CheckResult, CheckStatus, ReadinessRegistry
from app.core.settings import Settings
from app.domain.laws import ArticleDetailRecord, LawPage
from tests.laws.helpers import (
    FakeChatProvider,
    FakeLawRepository,
    make_article,
    make_evidence,
    make_law,
)


class InMemoryAuditRepository:
    def __init__(self) -> None:
        self.entries: list[Any] = []

    async def record(self, entry: Any) -> None:
        self.entries.append(entry)


class InMemoryAccountRepo:
    def __init__(self) -> None:
        self.records: dict[Any, Any] = {}

    async def get_by_id(self, account_id: Any) -> Any:
        return self.records.get(account_id)


class InMemorySessionRepo:
    def __init__(self) -> None:
        self.records: dict[Any, Any] = {}

    async def get_by_token_hash(self, token_hash: str) -> Any:
        return None

    async def create(self, record: Any) -> None:
        self.records[record.id] = record

    async def revoke(self, session_id: Any, revoked_at: Any) -> bool:
        return False

    async def revoke_all_for_account(self, account_id: Any, revoked_at: Any) -> int:
        return 0

    async def refresh(
        self, session_id: Any, new_expires_at: Any, new_csrf_hash: str
    ) -> bool:
        return True


@pytest.fixture()
def full_app(settings: Settings) -> FastAPI:
    """Create a test FastAPI app wired with in-memory stores and routers."""
    auth_settings = Settings(
        app_env="test",
        app_name=settings.app_name,
        app_version=settings.app_version,
        app_url=settings.app_url,
        allowed_origins=settings.allowed_origins,
        log_level=settings.log_level,
        request_id_header=settings.request_id_header,
        _env_file=None,
    )
    test_app = FastAPI(title=auth_settings.app_name, version=auth_settings.app_version)
    test_app.state.settings = auth_settings

    readiness = ReadinessRegistry()
    async def test_probe() -> CheckResult:
        return CheckResult(status=CheckStatus.OK)
    readiness.register("test_check", test_probe)
    test_app.state.readiness = readiness

    repo = FakeLawRepository()
    test_app.state.law_repository = repo
    provider = FakeChatProvider()
    test_app.state.chat_provider = provider

    account_repo = InMemoryAccountRepo()
    session_repo = InMemorySessionRepo()
    rate_limiter = InMemorySessionCreationRateLimiter()
    audit_repo = InMemoryAuditRepository()

    test_app.dependency_overrides[get_account_repository] = lambda: account_repo
    test_app.dependency_overrides[get_session_repository] = lambda: session_repo
    test_app.dependency_overrides[get_session_rate_limiter] = lambda: rate_limiter
    test_app.dependency_overrides[get_audit_repository] = lambda: audit_repo

    register_exception_handlers(test_app)
    test_app.add_middleware(RequestContextMiddleware, header_name=settings.request_id_header)

    test_app.include_router(health_router)
    test_app.include_router(meta.router, prefix="/v1")
    test_app.include_router(session.router, prefix="/v1")
    test_app.include_router(me.router, prefix="/v1")
    test_app.include_router(laws.router, prefix="/v1")
    test_app.include_router(answers.router, prefix="/v1")

    return test_app


@pytest.fixture()
def full_client(full_app: FastAPI) -> TestClient:
    return TestClient(full_app)


def test_http_contract_all_v1_operations(full_client: TestClient) -> None:
    """Verify all v1 operations respond according to OpenAPI contract and error envelope."""
    # 1. GET /health/live
    live_resp = full_client.get("/health/live")
    assert live_resp.status_code == 200
    assert live_resp.json()["status"] == "ok"

    # 2. GET /health/ready
    ready_resp = full_client.get("/health/ready")
    assert ready_resp.status_code in {200, 503}
    assert "status" in ready_resp.json()
    assert "checks" in ready_resp.json()

    # 3. GET /v1/meta
    meta_resp = full_client.get("/v1/meta")
    assert meta_resp.status_code == 200
    meta_data = meta_resp.json()
    assert set(meta_data["supported_answer_languages"]) == {"en", "rw", "fr"}
    assert "api_version" in meta_data
    assert "app_version" in meta_data
    assert "capabilities" in meta_data

    # 4. GET /v1/session
    session_resp = full_client.get("/v1/session")
    assert session_resp.status_code == 200
    sess_data = session_resp.json()
    assert sess_data["authenticated"] is False
    assert sess_data["account"] is None

    # 5. POST /v1/session (validation error on malformed payload)
    post_sess_resp = full_client.post("/v1/session", json={})
    assert post_sess_resp.status_code == 422
    err_body = post_sess_resp.json()["error"]
    assert err_body["code"] == "validation_error"
    assert "request_id" in err_body

    # 6. DELETE /v1/session (unauthenticated)
    del_sess_resp = full_client.delete("/v1/session")
    assert del_sess_resp.status_code == 401
    assert del_sess_resp.json()["error"]["code"] == "unauthorized"

    # 7. GET /v1/me (unauthenticated)
    me_resp = full_client.get("/v1/me")
    assert me_resp.status_code == 401
    assert me_resp.json()["error"]["code"] == "unauthorized"

    # 8. GET /v1/laws
    laws_resp = full_client.get("/v1/laws")
    assert laws_resp.status_code == 200
    laws_data = laws_resp.json()
    assert "items" in laws_data
    assert "total" in laws_data
    assert "page" in laws_data
    assert "page_size" in laws_data
    assert "categories" in laws_data

    # 9. GET /v1/laws/{law_id} (missing)
    missing_law_id = str(uuid4())
    law_detail_resp = full_client.get(f"/v1/laws/{missing_law_id}")
    assert law_detail_resp.status_code == 404
    assert law_detail_resp.json()["error"]["code"] == "not_found"

    # 10. GET /v1/laws/{law_id}/articles/{article_number} (missing)
    art_resp = full_client.get(f"/v1/laws/{missing_law_id}/articles/1")
    assert art_resp.status_code == 404
    assert art_resp.json()["error"]["code"] == "not_found"

    # 11. GET /v1/laws/{law_id}/timeline (missing)
    timeline_resp = full_client.get(f"/v1/laws/{missing_law_id}/timeline")
    assert timeline_resp.status_code == 404
    assert timeline_resp.json()["error"]["code"] == "not_found"

    # 12. Answers require a session; validation is checked with an authenticated principal.
    assert full_client.post(
        "/v1/answers", json={"question": "What is the law?", "language": "en"}
    ).status_code == 401
    full_client.app.dependency_overrides[get_current_principal] = lambda: object()
    answer_val_resp = full_client.post("/v1/answers", json={"question": ""})
    assert answer_val_resp.status_code == 422
    assert answer_val_resp.json()["error"]["code"] == "validation_error"


def test_http_contract_answer_kinds(full_app: FastAPI, full_client: TestClient) -> None:
    full_app.dependency_overrides[get_current_principal] = lambda: object()
    """Verify all 5 answer kinds adhere strictly to the AnswerResponse contract."""
    # 1. emergency (deterministic keyword match, no provider call)
    resp_emerg = full_client.post(
        "/v1/answers",
        json={"question": "police emergency help isange", "language": "en"},
    )
    assert resp_emerg.status_code == 200
    data_emerg = resp_emerg.json()
    assert data_emerg["kind"] == "emergency"
    assert data_emerg["language"] == "en"
    assert "112" in data_emerg["answer"]
    assert data_emerg["emergency"] is not None
    assert len(data_emerg["emergency"]["contacts"]) >= 3

    # 2. greeting (deterministic, no provider call)
    resp_greet = full_client.post(
        "/v1/answers",
        json={"question": "hello", "language": "en"},
    )
    assert resp_greet.status_code == 200
    data_greet = resp_greet.json()
    assert data_greet["kind"] == "greeting"
    assert data_greet["language"] == "en"
    assert len(data_greet["answer"]) > 0

    # 3. help (deterministic, no provider call)
    resp_help = full_client.post(
        "/v1/answers",
        json={"question": "help me please", "language": "en"},
    )
    assert resp_help.status_code == 200
    data_help = resp_help.json()
    assert data_help["kind"] == "help"
    assert data_help["language"] == "en"
    assert len(data_help["answer"]) > 0

    # 4. abstained (no retrieved evidence)
    repo: FakeLawRepository = full_app.state.law_repository
    repo.search_evidence_result = ()
    resp_abs = full_client.post(
        "/v1/answers",
        json={"question": "What is the speed of light under Rwandan taxation?", "language": "en"},
    )
    assert resp_abs.status_code == 200
    data_abs = resp_abs.json()
    assert data_abs["kind"] == "abstained"
    assert data_abs["abstention_reason"] is not None
    assert len(data_abs["sources"]) == 0

    # 5. answered (retrieved evidence and grounded answer)
    evidence = make_evidence(
        article_number="15",
        article_content="Maternity leave is fourteen consecutive weeks.",
        citation="Article 15 of Law n° 027/2023",
        law_reviewed_at=datetime(2024, 1, 1, tzinfo=UTC),
    )
    repo.search_evidence_result = (evidence,)
    provider: FakeChatProvider = full_app.state.chat_provider
    provider.reply = (
        "According to Article 15 of Law n° 027/2023, maternity leave is "
        "fourteen consecutive weeks."
    )

    resp_ans = full_client.post(
        "/v1/answers",
        json={"question": "How long is maternity leave?", "language": "en"},
    )
    assert resp_ans.status_code == 200
    data_ans = resp_ans.json()
    assert data_ans["kind"] == "answered"
    assert len(data_ans["sources"]) == 1
    src = data_ans["sources"][0]
    assert src["article_number"] == "15"
    assert src["review_status"] == "reviewed"


def test_http_contract_review_status_honesty(
    full_app: FastAPI,
    full_client: TestClient,
) -> None:
    """review_status is 'reviewed' iff reviewed_at is stored; review_scope is 'classification'."""
    repo: FakeLawRepository = full_app.state.law_repository

    # Unreviewed law (reviewed_at = None)
    unreviewed_law = make_law(
        id="11111111-1111-1111-1111-111111111111",
        reviewed_at=None,
        reviewed_by=None,
    )
    unreviewed_article = make_article(
        law_id=unreviewed_law.id,
        article_number="1",
    )
    repo.law = unreviewed_law
    repo.articles = (unreviewed_article,)
    repo.article_detail = ArticleDetailRecord(
        article=unreviewed_article,
        law_title=unreviewed_law.title,
        law_reference_number=unreviewed_law.reference_number,
        law_status=unreviewed_law.status,
        law_source_url=unreviewed_law.source_url,
    )

    resp = full_client.get(f"/v1/laws/{unreviewed_law.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["review_status"] == "pending"
    assert data["review_scope"] == "classification"

    resp_art = full_client.get(f"/v1/laws/{unreviewed_law.id}/articles/1")
    assert resp_art.status_code == 200
    art_data = resp_art.json()
    assert art_data["status"] == "active"
    assert art_data["article_number"] == "1"

    # Reviewed law (reviewed_at != None)
    reviewed_law = make_law(
        id="22222222-2222-2222-2222-222222222222",
        reviewed_at=datetime(2025, 2, 1, tzinfo=UTC),
        reviewed_by="admin-1",
    )
    reviewed_article = make_article(
        law_id=reviewed_law.id,
        article_number="2",
    )
    repo.law = reviewed_law
    repo.articles = (reviewed_article,)
    repo.article_detail = ArticleDetailRecord(
        article=reviewed_article,
        law_title=reviewed_law.title,
        law_reference_number=reviewed_law.reference_number,
        law_status=reviewed_law.status,
        law_source_url=reviewed_law.source_url,
    )

    resp_rev = full_client.get(f"/v1/laws/{reviewed_law.id}")
    assert resp_rev.status_code == 200
    data_rev = resp_rev.json()
    assert data_rev["review_status"] == "reviewed"
    assert data_rev["review_scope"] == "classification"


def test_http_contract_no_optimistic_defaults(
    full_app: FastAPI,
    full_client: TestClient,
) -> None:
    """Never coerce unknown status to active, null languages to all 3, or null URL to RLRC."""
    repo: FakeLawRepository = full_app.state.law_repository

    unknown_law = make_law(
        id="33333333-3333-3333-3333-333333333333",
        status="unknown",
        languages_available=None,
        source_url=None,
    )
    repo.page = LawPage(
        items=(unknown_law,),
        page=1,
        page_size=20,
        total=1,
    )
    repo.law = unknown_law

    resp = full_client.get("/v1/laws")
    assert resp.status_code == 200
    item = resp.json()["items"][0]
    assert item["status"] == "unknown"  # Not coerced to 'active'
    assert item["languages_available"] is None  # Not coerced to ['en', 'rw', 'fr']
    assert item["source_url"] is None  # Not coerced to 'https://www.rlrc.gov.rw/'

    detail_resp = full_client.get(f"/v1/laws/{unknown_law.id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["status"] == "unknown"
    assert detail["languages_available"] is None
    assert detail["source_url"] is None
