"""Public request and response schemas for identity and sessions."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Self
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    StringConstraints,
    model_validator,
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
        max_length=254,
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
    """Start a browser session from credentials or an existing access token.

    Exactly one mechanism must be supplied:

    * ``email`` + ``password`` for the first-party web sign-in form;
    * ``access_token`` for a client that already holds a Supabase token, such as
      the Flutter application after its own sign-in flow.

    The server verifies the resulting Supabase token in both cases before it
    creates an opaque session. A token's claims can never grant a role.
    """

    model_config = ConfigDict(extra="forbid")

    access_token: SecretStr | None = Field(
        default=None,
        description=(
            "Supabase access token issued by the configured identity provider. "
            "It is never logged or stored in plaintext."
        ),
    )
    email: EmailText | None = Field(
        default=None,
        description="Email address for first-party password sign-in.",
    )
    password: PasswordText | None = Field(
        default=None,
        description="Password for first-party sign-in; never logged.",
    )

    @model_validator(mode="after")
    def _exactly_one_mechanism(self) -> Self:
        token = self.access_token is not None
        password = self.email is not None or self.password is not None
        if token and password:
            raise ValueError(
                "Provide either access_token or email/password, not both."
            )
        if not token and not (self.email is not None and self.password is not None):
            raise ValueError("Provide access_token or both email and password.")
        return self


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
