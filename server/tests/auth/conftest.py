"""Local, database-free fixtures for the identity and RBAC slice."""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
from uuid import UUID, uuid4

import httpx
import pytest
from auth_helpers import JWT_SECRET, SUPABASE_URL, make_token
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.v1.routes import me, session
from app.auth.dependencies import (
    get_account_repository,
    get_current_principal,
    get_session_rate_limiter,
    get_session_repository,
)
from app.auth.principal import Principal
from app.auth.rate_limit import InMemorySessionCreationRateLimiter
from app.auth.session_tokens import CSRF_HEADER_NAME
from app.authorization.audit import AuditEntry
from app.authorization.dependencies import get_audit_repository, require_permission
from app.authorization.permissions import Permission, Role
from app.core.errors import register_exception_handlers
from app.core.middleware import RequestContextMiddleware
from app.core.settings import Settings
from app.repositories.accounts import AccountRecord
from app.repositories.sessions import SessionRecord


class FakeAccountRepository:
    """In-memory account store implementing the repository protocol."""

    def __init__(self) -> None:
        self.records: dict[UUID, AccountRecord] = {}

    def add(
        self,
        *,
        role: Role,
        status: str = "active",
        email: str | None = None,
    ) -> AccountRecord:
        record = AccountRecord(
            id=uuid4(),
            auth_user_id=uuid4(),
            email=email or f"{role.value}-{uuid4().hex[:8]}@example.test",
            role=role.value,
            status=status,
        )
        self.records[record.id] = record
        return record

    def set_status(self, account_id: UUID, status: str) -> None:
        self.records[account_id] = replace(self.records[account_id], status=status)

    def set_role(self, account_id: UUID, role: Role) -> None:
        self.records[account_id] = replace(self.records[account_id], role=role.value)

    async def get_by_id(self, account_id: UUID) -> AccountRecord | None:
        await asyncio.sleep(0)
        return self.records.get(account_id)

    async def get_by_auth_user_id(self, auth_user_id: UUID) -> AccountRecord | None:
        await asyncio.sleep(0)
        return next(
            (
                account
                for account in self.records.values()
                if account.auth_user_id == auth_user_id
            ),
            None,
        )


class FakeSessionRepository:
    """In-memory session store; tests can mutate expiry and revocation."""

    def __init__(self) -> None:
        self.records: dict[UUID, SessionRecord] = {}

    async def create(self, session: SessionRecord) -> None:
        await asyncio.sleep(0)
        self.records[session.id] = session

    async def get_by_token_hash(self, token_hash: str) -> SessionRecord | None:
        await asyncio.sleep(0)
        return next(
            (record for record in self.records.values() if record.token_hash == token_hash),
            None,
        )

    async def revoke(self, session_id: UUID, revoked_at: datetime) -> bool:
        await asyncio.sleep(0)
        record = self.records.get(session_id)
        if record is None or record.revoked_at is not None:
            return False
        self.records[session_id] = replace(record, revoked_at=revoked_at)
        return True

    async def touch_last_seen(self, session_id: UUID, seen_at: datetime) -> None:
        await asyncio.sleep(0)
        record = self.records.get(session_id)
        if record is not None and record.revoked_at is None:
            self.records[session_id] = replace(record, last_seen_at=seen_at)

    def only_session(self) -> SessionRecord:
        assert len(self.records) == 1
        return next(iter(self.records.values()))

    def mark_revoked(self, session_id: UUID) -> None:
        self.records[session_id] = replace(
            self.records[session_id], revoked_at=datetime.now(UTC)
        )

    def mark_expired(self, session_id: UUID) -> None:
        self.records[session_id] = replace(
            self.records[session_id],
            expires_at=datetime.now(UTC) - timedelta(seconds=1),
        )


class FakeAuditRepository:
    """Captures audit entries instead of touching PostgreSQL."""

    def __init__(self) -> None:
        self.entries: list[AuditEntry] = []

    async def record(self, entry: AuditEntry) -> None:
        await asyncio.sleep(0)
        self.entries.append(entry)


@dataclass(frozen=True)
class LoginResult:
    response: httpx.Response
    access_token: str


@dataclass
class AuthHarness:
    app: FastAPI
    client: TestClient
    settings: Settings
    accounts: FakeAccountRepository
    sessions: FakeSessionRepository
    audit: FakeAuditRepository

    def token_for(self, account: AccountRecord, **overrides: Any) -> str:
        return make_token(account.auth_user_id or account.id, **overrides)

    def login(self, account: AccountRecord, token: str | None = None) -> LoginResult:
        access_token = token if token is not None else self.token_for(account)
        response = self.client.post(
            "/v1/session",
            json={"access_token": access_token},
        )
        return LoginResult(response=response, access_token=access_token)

    def csrf_header(self) -> dict[str, str]:
        value = self.client.cookies.get(self.settings.csrf_cookie_name)
        return {CSRF_HEADER_NAME: value} if value else {}

    def session_cookie(self) -> str | None:
        return self.client.cookies.get(self.settings.session_cookie_name)

    def csrf_cookie(self) -> str | None:
        return self.client.cookies.get(self.settings.csrf_cookie_name)


test_router = APIRouter(prefix="/test", tags=["test"])


@test_router.post("/permissions/draft")
def test_require_draft(
    _: Annotated[Principal, Depends(require_permission(Permission.LAW_DRAFT))],
) -> dict[str, bool]:
    return {"ok": True}


@test_router.post("/permissions/publish")
def test_require_publish(
    _: Annotated[Principal, Depends(require_permission(Permission.LAW_PUBLISH))],
) -> dict[str, bool]:
    return {"ok": True}


@test_router.post("/permissions/staff")
def test_require_staff_manage(
    _: Annotated[Principal, Depends(require_permission(Permission.STAFF_MANAGE))],
) -> dict[str, bool]:
    return {"ok": True}


@test_router.post("/authenticated/mutation")
def test_authenticated_mutation(
    _: Annotated[Principal, Depends(get_current_principal)],
) -> dict[str, bool]:
    return {"ok": True}


@pytest.fixture()
def auth_settings() -> Settings:
    return Settings(
        app_env="test",
        app_name="Rengera AI API",
        app_version="0.1.0",
        app_url="http://testserver",
        allowed_origins="http://localhost:5173",
        request_id_header="X-Request-ID",
        supabase_url=SUPABASE_URL,
        supabase_jwt_secret=JWT_SECRET,
        cookie_secure=False,
        session_ttl_seconds=3600,
        _env_file=None,
    )


@pytest.fixture()
def harness(auth_settings: Settings) -> Iterator[AuthHarness]:
    accounts = FakeAccountRepository()
    sessions = FakeSessionRepository()
    audit = FakeAuditRepository()

    app = FastAPI(title="Rengera AI auth test app", version="0.0.0")
    app.state.settings = auth_settings
    register_exception_handlers(app)
    app.add_middleware(
        RequestContextMiddleware,
        header_name=auth_settings.request_id_header,
    )
    app.include_router(session.router, prefix="/v1")
    app.include_router(me.router, prefix="/v1")
    app.include_router(test_router, prefix="/v1")

    app.dependency_overrides[get_account_repository] = lambda: accounts
    app.dependency_overrides[get_session_repository] = lambda: sessions
    app.dependency_overrides[get_audit_repository] = lambda: audit
    app.dependency_overrides[get_session_rate_limiter] = lambda: (
        InMemorySessionCreationRateLimiter(max_attempts=1000)
    )

    with TestClient(app) as client:
        yield AuthHarness(
            app=app,
            client=client,
            settings=auth_settings,
            accounts=accounts,
            sessions=sessions,
            audit=audit,
        )
