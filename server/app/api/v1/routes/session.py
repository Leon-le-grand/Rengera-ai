"""Browser session lifecycle: create, inspect and revoke an opaque session."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.v1.schemas.auth import (
    AccountSummary,
    SessionCreateRequest,
    SessionResponse,
)
from app.auth.cookies import clear_session_cookies, set_session_cookies
from app.auth.dependencies import (
    CurrentPrincipalDep,
    OptionalSessionDep,
    PasswordAuthenticatorDep,
    SessionRateLimiterDep,
    SessionServiceDep,
    SettingsDep,
    TokenVerifierDep,
    session_creation_key,
)
from app.auth.errors import (
    AuthenticationConfigurationError,
    AuthenticationError,
    IdentityProviderUnavailableError,
)
from app.authorization.permissions import permission_snapshot
from app.core.errors import ErrorResponse

logger = logging.getLogger("app.api.session")

router = APIRouter(prefix="/session", tags=["session"])

_NO_STORE = {"Cache-Control": "no-store"}
_RATE_LIMITED_DETAIL = "Too many session requests. Please try again later."
_AUTH_FAILED_DETAIL = "Authentication failed."

_ERROR_RESPONSES = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorResponse,
        "description": "The credentials or access token were rejected.",
    },
    status.HTTP_429_TOO_MANY_REQUESTS: {
        "model": ErrorResponse,
        "description": "Too many session-creation attempts from this client.",
    },
    status.HTTP_503_SERVICE_UNAVAILABLE: {
        "model": ErrorResponse,
        "description": (
            "Supabase token verification is not configured or the identity "
            "provider is unreachable."
        ),
    },
}


@router.post(
    "",
    response_model=SessionResponse,
    operation_id="createSession",
    summary="Exchange a Supabase access token for a server session",
    responses=_ERROR_RESPONSES,
)
async def create_session(
    payload: SessionCreateRequest,
    request: Request,
    response: Response,
    settings: SettingsDep,
    service: SessionServiceDep,
    verifier: TokenVerifierDep,
    authenticator: PasswordAuthenticatorDep,
    rate_limiter: SessionRateLimiterDep,
) -> SessionResponse:
    """Authenticate credentials or a token, then set opaque session cookies."""
    if not rate_limiter.allow(session_creation_key(request)):
        logger.warning("session_rate_limited", extra={"event": "session_rate_limited"})
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=_RATE_LIMITED_DETAIL,
        )

    try:
        if payload.access_token is not None:
            access_token = payload.access_token.get_secret_value()
        else:
            # The schema guarantees both fields when access_token is absent.
            assert payload.email is not None and payload.password is not None
            access_token = await authenticator.sign_in(
                payload.email,
                payload.password.get_secret_value(),
            )
        created = await service.create_session(access_token, verifier)
    except IdentityProviderUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The identity provider is temporarily unavailable.",
        ) from None
    except AuthenticationConfigurationError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not available.",
        ) from None
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_AUTH_FAILED_DETAIL,
        ) from None

    set_session_cookies(
        response,
        settings=settings,
        session_token=created.token,
        csrf_token=created.csrf_token,
    )
    response.headers.update(_NO_STORE)
    return SessionResponse(
        authenticated=True,
        account=AccountSummary.from_principal(created.principal),
        capabilities=permission_snapshot(created.principal.permissions),
        csrf_token=created.csrf_token,
        expires_at=created.expires_at,
    )


@router.get(
    "",
    response_model=SessionResponse,
    operation_id="getSession",
    summary="Get the current browser session (never fails for anonymous callers)",
)
async def get_session(
    request: Request,
    response: Response,
    settings: SettingsDep,
    session: OptionalSessionDep,
) -> SessionResponse:
    """Return authenticated state, or a 200 anonymous snapshot with empty grants."""
    response.headers.update(_NO_STORE)
    if session is None:
        if request.cookies.get(settings.session_cookie_name):
            clear_session_cookies(response, settings=settings)
        return SessionResponse(authenticated=False, capabilities=[])

    return SessionResponse(
        authenticated=True,
        account=AccountSummary.from_principal(session.principal),
        capabilities=permission_snapshot(session.principal.permissions),
        expires_at=session.expires_at,
    )


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
    operation_id="deleteSession",
    summary="Revoke the current session and clear session cookies",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "No live session was presented.",
        },
        status.HTTP_403_FORBIDDEN: {
            "model": ErrorResponse,
            "description": "The CSRF header was missing or did not match.",
        },
    },
)
async def delete_session(
    principal: CurrentPrincipalDep,
    service: SessionServiceDep,
    settings: SettingsDep,
) -> Response:
    """Revoke server state and expire both cookies; CSRF is enforced upstream."""
    await service.revoke_session(principal.session_id)
    response = Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers=_NO_STORE,
    )
    clear_session_cookies(response, settings=settings)
    return response
