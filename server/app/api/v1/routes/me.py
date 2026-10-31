"""Current-account endpoint backed by a verified server session."""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.api.v1.schemas.auth import AccountSummary, CurrentAccountResponse
from app.auth.dependencies import CurrentPrincipalDep
from app.authorization.permissions import permission_snapshot
from app.core.errors import ErrorResponse

router = APIRouter(prefix="/me", tags=["identity"])


@router.get(
    "",
    response_model=CurrentAccountResponse,
    operation_id="getCurrentAccount",
    summary="Get the verified account and effective capabilities",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "A live server session is required.",
        }
    },
)
async def get_current_account(
    principal: CurrentPrincipalDep,
    response: Response,
) -> CurrentAccountResponse:
    """Return server-derived identity and a display-only capability snapshot."""
    response.headers["Cache-Control"] = "no-store"
    return CurrentAccountResponse(
        account=AccountSummary.from_principal(principal),
        capabilities=permission_snapshot(principal.permissions),
    )
