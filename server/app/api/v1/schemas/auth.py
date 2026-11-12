"""Public request and response schemas for identity and sessions."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    StringConstraints,
)

from app.auth.principal import AccountStatus, Principal
from app.authorization.permissions import POLICY_VERSION, Permission, Role

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

EmailText = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=3,
        max_length=170,
        pattern=EMAIL_PATTERN,
    ),
    Field(description="Account email address."),
]

PasswordText = Annotated[
    SecretStr,
    Field(
        min_length=8,
        max_length=128,
        description="Account password; never logged or stored by this API.",
    ),
]


class AccountSummary(BaseModel):
    """Presentation-safe account identity; never includes tokens or secrets."""

    id: UUID = Field(description="Server account identifier.")
    email: str = Field(description="Account email address.")
    role: Role = Field(description="Server-owned application role.")
    status: AccountStatus = Field(description="Current account status.")

    @classmethod
    def from_principal(cls, principal: Principal) -> AccountSummary:
        return cls(
            id=principal.account_id,
            email=principal.email,
            role=principal.role,
            status=principal.status,
        )


class SessionCreateRequest(BaseModel):
    """Start a server session from first-party account credentials."""

    model_config = ConfigDict(extra="forbid")

    email: EmailText = Field(
        description="Email address for first-party password sign-in.",
    )
    password: PasswordText = Field(
        description="Password for first-party sign-in; never logged.",
    )


class SessionResponse(BaseModel):
    """Current browser session state and display-only capability snapshot."""

    authenticated: bool = Field(description="Whether a live server session was resolved.")
    account: AccountSummary | None = Field(default=None)
    capabilities: list[Permission] = Field(default_factory=list)
    csrf_token: str | None = Field(
        default=None,
        description=(
            "Returned when a session is created. The same value is also set as a "
            "readable double-submit cookie so a reloaded browser tab can recover it."
        ),
    )
    expires_at: datetime | None = Field(default=None)
    policy_version: str = Field(default=POLICY_VERSION)


class CurrentAccountResponse(BaseModel):
    """Verified account and effective capabilities for the current session."""

    account: AccountSummary
    capabilities: list[Permission]
    policy_version: str = Field(default=POLICY_VERSION)


class CitizenRegisterRequest(BaseModel):
    """operator registration request payload."""

    model_config = ConfigDict(extra="forbid")

    email: EmailText = Field(description="operator email address.")
    password: PasswordText = Field(description="Password (minimum 8 characters).")
    full_name: str | None = Field(
        default=None,
        max_length=100,
        description="Optional full name or display name.",
    )

