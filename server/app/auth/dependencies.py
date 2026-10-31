"""FastAPI dependencies for identity, sessions and CSRF."""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status

from app.auth.errors import AuthenticationConfigurationError
from app.auth.password import PasswordAuthenticator, SupabasePasswordAuthenticator
from app.auth.principal import AuthenticatedContext, Principal
from app.auth.rate_limit import InMemorySessionCreationRateLimiter, client_ip
from app.auth.service import SessionService
from app.auth.session_tokens import CSRF_HEADER_NAME, csrf_token_matches
from app.auth.supabase_tokens import SupabaseTokenVerifier
from app.core.db import Database, get_database
from app.core.request_context import current_or_new_request_id
from app.core.settings import Settings
from app.repositories.accounts import AccountRepository, SqlAccountRepository
from app.repositories.sessions import SessionRepository, SqlSessionRepository

logger = logging.getLogger("app.auth.dependencies")

AUTHENTICATION_REQUIRED_DETAIL = "Authentication required."
CSRF_REJECTED_DETAIL = "Invalid or missing CSRF token."
AUTH_NOT_AVAILABLE_DETAIL = "Authentication is not available."

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})


def get_request_settings(request: Request) -> Settings:
    """Return validated settings attached by the application factory."""
    settings = getattr(request.app.state, "settings", None)
    if not isinstance(settings, Settings):
        raise RuntimeError("application settings are not configured")
    return settings


SettingsDep = Annotated[Settings, Depends(get_request_settings)]


class _RequestDatabase:
    """Resolve the shared pool only when a repository actually queries it.

    ``GET /v1/session`` must answer anonymously even when the database pool is
    unavailable. FastAPI resolves every dependency before calling a route, so
    the repository dependencies cannot require ``get_database`` eagerly; this
    adapter defers that lookup (and its 503) until a query runs.
    """

    def __init__(self, request: Request) -> None:
        self._request = request

    def _database(self) -> Database:
        return get_database(self._request)

    async def fetch(self, query: str, *args: Any) -> list[Any]:
        return await self._database().fetch(query, *args)

    async def fetchrow(self, query: str, *args: Any) -> Any:
        return await self._database().fetchrow(query, *args)

    async def fetchval(self, query: str, *args: Any) -> Any:
        return await self._database().fetchval(query, *args)

    async def execute(self, query: str, *args: Any) -> str:
        return await self._database().execute(query, *args)


def get_account_repository(request: Request) -> AccountRepository:
    return SqlAccountRepository(_RequestDatabase(request))


AccountRepositoryDep = Annotated[AccountRepository, Depends(get_account_repository)]


def get_session_repository(request: Request) -> SessionRepository:
    return SqlSessionRepository(_RequestDatabase(request))


SessionRepositoryDep = Annotated[SessionRepository, Depends(get_session_repository)]


def get_session_service(
    settings: SettingsDep,
    accounts: AccountRepositoryDep,
    sessions: SessionRepositoryDep,
) -> SessionService:
    return SessionService(accounts=accounts, sessions=sessions, settings=settings)


SessionServiceDep = Annotated[SessionService, Depends(get_session_service)]


def get_token_verifier(
    request: Request,
    settings: SettingsDep,
) -> SupabaseTokenVerifier:
    """Build and cache the Supabase verifier (including its JWKS key cache)."""
    cached = getattr(request.app.state, "supabase_token_verifier", None)
    if isinstance(cached, SupabaseTokenVerifier):
        return cached
    try:
        verifier = SupabaseTokenVerifier.from_settings(settings)
    except AuthenticationConfigurationError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=AUTH_NOT_AVAILABLE_DETAIL,
        ) from None
    request.app.state.supabase_token_verifier = verifier
    return verifier


TokenVerifierDep = Annotated[SupabaseTokenVerifier, Depends(get_token_verifier)]


def get_password_authenticator(
    request: Request,
    settings: SettingsDep,
) -> PasswordAuthenticator:
    """Return the configured password authenticator, or a failing adapter.

    Construction is lazy so anonymous and token-exchange flows keep working
    when email/password sign-in is not configured.
    """
    cached = getattr(request.app.state, "password_authenticator", None)
    if cached is not None:
        return cached
    authenticator = SupabasePasswordAuthenticator(settings)
    request.app.state.password_authenticator = authenticator
    return authenticator


PasswordAuthenticatorDep = Annotated[
    PasswordAuthenticator,
    Depends(get_password_authenticator),
]


def get_session_rate_limiter(request: Request) -> InMemorySessionCreationRateLimiter:
    """Return the process-local session-creation limiter.

    Limitation recorded for this slice: the bucket store is in memory and is not
    shared between workers or hosts. Replace it before horizontal scale-out.
    """
    cached = getattr(request.app.state, "session_rate_limiter", None)
    if isinstance(cached, InMemorySessionCreationRateLimiter):
        return cached
    limiter = InMemorySessionCreationRateLimiter()
    request.app.state.session_rate_limiter = limiter
    return limiter


SessionRateLimiterDep = Annotated[
    InMemorySessionCreationRateLimiter,
    Depends(get_session_rate_limiter),
]


def session_creation_key(request: Request) -> str:
    """Rate-limit key from the direct peer address, never an untrusted header."""
    return client_ip(request.client.host if request.client is not None else None)


async def get_optional_session(
    request: Request,
    settings: SettingsDep,
    service: SessionServiceDep,
) -> AuthenticatedContext | None:
    """Resolve a cookie session when present; anonymous requests return ``None``."""
    raw_token = request.cookies.get(settings.session_cookie_name)
    return await service.authenticate(raw_token)


OptionalSessionDep = Annotated[
    AuthenticatedContext | None,
    Depends(get_optional_session),
]


async def get_authenticated_context(
    session: OptionalSessionDep,
) -> AuthenticatedContext:
    """Require a live session; otherwise raise a safe 401."""
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=AUTHENTICATION_REQUIRED_DETAIL,
        )
    return session


AuthenticatedContextDep = Annotated[
    AuthenticatedContext,
    Depends(get_authenticated_context),
]


def _route_template(request: Request) -> str:
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    return path if isinstance(path, str) and path else request.url.path


def _reject_csrf(request: Request, context: AuthenticatedContext) -> None:
    logger.warning(
        "csrf_rejected",
        extra={
            "event": "csrf_rejected",
            "account_id": str(context.principal.account_id),
            "method": request.method,
            "path": _route_template(request),
            "request_id": current_or_new_request_id(),
        },
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=CSRF_REJECTED_DETAIL,
    )


def ensure_csrf(request: Request, context: AuthenticatedContext) -> None:
    """Reject state-changing requests without the matching CSRF header."""
    if request.method.upper() in SAFE_METHODS:
        return
    provided = request.headers.get(CSRF_HEADER_NAME)
    if not csrf_token_matches(provided, context.csrf_token_hash):
        _reject_csrf(request, context)


async def require_csrf(
    request: Request,
    context: AuthenticatedContextDep,
) -> None:
    """Explicit CSRF dependency for routes using the context directly."""
    ensure_csrf(request, context)


async def get_current_principal(
    request: Request,
    context: AuthenticatedContextDep,
) -> Principal:
    """Return the verified principal and CSRF-protect unsafe methods.

    This is the default authenticated dependency. Every POST/PUT/PATCH/DELETE
    must present ``X-CSRF-Token``; GET/HEAD/OPTIONS/TRACE do not.
    """
    ensure_csrf(request, context)
    return context.principal


CurrentPrincipalDep = Annotated[Principal, Depends(get_current_principal)]
