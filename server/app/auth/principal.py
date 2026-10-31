"""Authenticated principal and session context models."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.authorization.permissions import Permission, Role


class AccountStatus(StrEnum):
    """Account states allowed by the identity schema."""

    ACTIVE = "active"
    SUSPENDED = "suspended"


class Principal(BaseModel):
    """The server-verified identity attached to one request.

    ``role`` and ``permissions`` come from the account record and the fixed
    permission catalog, never from JWT role claims or client input.
    """

    model_config = ConfigDict(frozen=True)

    account_id: UUID
    auth_user_id: UUID | None
    email: str
    role: Role
    status: AccountStatus
    permissions: frozenset[Permission] = Field(default_factory=frozenset)
    session_id: UUID


@dataclass(frozen=True, slots=True)
class AuthenticatedContext:
    """Principal plus the CSRF material needed by request dependencies."""

    principal: Principal
    csrf_token_hash: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class CreatedSession:
    """A newly minted opaque session and its presentation-safe identity."""

    token: str
    csrf_token: str
    expires_at: datetime
    principal: Principal
