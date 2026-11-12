"""Session creation, validation and revocation.

Every request re-loads the account and its role from ``app_users``. Token role
claims, cookies and query parameters cannot grant permissions.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.auth.errors import AuthenticationError
from app.auth.password import hash_password, verify_password
from app.auth.principal import (
    AccountStatus,
    AuthenticatedContext,
    CreatedSession,
    Principal,
)
from app.auth.session_tokens import (
    generate_csrf_token,
    generate_session_token,
    hash_token,
)
from app.authorization.permissions import Role, permissions_for_role
from app.core.settings import Settings
from app.repositories.accounts import AccountRecord, AccountRepository
from app.repositories.sessions import SessionRecord, SessionRepository

logger = logging.getLogger("app.auth.session")

SESSION_TOUCH_INTERVAL = timedelta(minutes=5)


class SessionService:
    """Coordinate verified identity, account state and opaque browser sessions."""

    def __init__(
        self,
        *,
        accounts: AccountRepository,
        sessions: SessionRepository,
        settings: Settings,
    ) -> None:
        self._accounts = accounts
        self._sessions = sessions
        self._settings = settings

    async def _issue_session_for_account(
        self,
        account: AccountRecord,
        role: Role,
    ) -> CreatedSession:
        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=self._settings.session_ttl_seconds)
        session_token = generate_session_token()
        csrf_token = generate_csrf_token()
        principal = Principal(
            account_id=account.id,
            email=account.email,
            role=role,
            status=AccountStatus.ACTIVE,
            permissions=permissions_for_role(role),
            session_id=uuid4(),
        )
        await self._sessions.create(
            SessionRecord(
                id=principal.session_id,
                account_id=principal.account_id,
                token_hash=hash_token(session_token),
                csrf_token_hash=hash_token(csrf_token),
                created_at=now,
                expires_at=expires_at,
                last_seen_at=now,
            )
        )
        logger.info(
            "session_created",
            extra={
                "event": "session_created",
                "account_id": str(principal.account_id),
                "role": role.value,
            },
        )
        return CreatedSession(
            token=session_token,
            csrf_token=csrf_token,
            expires_at=expires_at,
            principal=principal,
        )

    async def authenticate_credentials(
        self,
        email: str,
        password: str,
    ) -> CreatedSession:
        """Authenticate user credentials directly against public.app_users."""
        account = await self._accounts.get_by_email(email.strip().lower())
        if account is None or not verify_password(password, account.password_hash):
            logger.warning(
                "session_creation_rejected",
                extra={"event": "session_creation_rejected", "reason": "invalid_credentials"},
            )
            raise AuthenticationError("invalid_credentials")

        role = _active_role(account)
        if role is None:
            logger.warning(
                "session_creation_rejected",
                extra={
                    "event": "session_creation_rejected",
                    "reason": "account_inactive_or_role_invalid",
                },
            )
            raise AuthenticationError("account_inactive_or_role_invalid")

        return await self._issue_session_for_account(account, role)

    async def register_citizen(
        self,
        email: str,
        password: str,
        full_name: str = "",
    ) -> CreatedSession:
        """Register a new operator account and issue a server session."""
        norm_email = email.strip().lower()
        if not norm_email or "@" not in norm_email:
            raise ValueError("Invalid email address")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")

        existing = await self._accounts.get_by_email(norm_email)
        if existing is not None:
            raise ValueError("Email is already registered")

        pwd_hash = hash_password(password)
        account = await self._accounts.create_citizen(
            email=norm_email,
            password_hash=pwd_hash,
            full_name=full_name.strip(),
        )
        return await self._issue_session_for_account(account, Role.USER)

    async def authenticate(self, raw_session_token: str | None) -> AuthenticatedContext | None:
        """Resolve a cookie value to a live principal, or ``None`` if invalid."""
        if not raw_session_token:
            return None
        record = await self._sessions.get_by_token_hash(hash_token(raw_session_token))
        if record is None:
            return None
        now = datetime.now(UTC)
        if record.revoked_at is not None or record.expires_at <= now:
            return None

        account = await self._accounts.get_by_id(record.account_id)
        role = _active_role(account)
        if account is None or role is None:
            return None

        principal = Principal(
            account_id=account.id,
            email=account.email,
            role=role,
            status=AccountStatus.ACTIVE,
            permissions=permissions_for_role(role),
            session_id=record.id,
        )
        await self._touch_if_stale(record, now)
        return AuthenticatedContext(
            principal=principal,
            csrf_token_hash=record.csrf_token_hash,
            expires_at=record.expires_at,
        )

    async def revoke_session(self, session_id: UUID) -> bool:
        """Revoke one server session; raw tokens are never needed for logout."""
        revoked = await self._sessions.revoke(session_id, datetime.now(UTC))
        if revoked:
            logger.info(
                "session_revoked",
                extra={"event": "session_revoked", "session_id": str(session_id)},
            )
        return revoked

    async def revoke_all_for_account(self, account_id: UUID) -> int:
        """Revoke all active sessions for an account (used on suspension)."""
        count = await self._sessions.revoke_all_for_account(account_id, datetime.now(UTC))
        if count > 0:
            logger.info(
                "sessions_revoked_for_account",
                extra={
                    "event": "sessions_revoked_for_account",
                    "account_id": str(account_id),
                    "count": count,
                },
            )
        return count

    async def refresh_session(self, session_id: UUID) -> tuple[datetime, str] | None:
        """Extend session expiration and generate a new CSRF token."""
        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=self._settings.session_ttl_seconds)
        new_csrf = generate_csrf_token()
        refreshed = await self._sessions.refresh(
            session_id, expires_at, hash_token(new_csrf)
        )
        if not refreshed:
            return None
        return expires_at, new_csrf

    async def _touch_if_stale(self, record: SessionRecord, now: datetime) -> None:
        last_seen = record.last_seen_at
        if last_seen is not None and now - last_seen < SESSION_TOUCH_INTERVAL:
            return
        try:
            await self._sessions.touch_last_seen(record.id, now)
        except Exception:
            # Activity metadata is useful but never worth failing a valid request.
            logger.warning(
                "session_touch_failed",
                extra={"event": "session_touch_failed", "session_id": str(record.id)},
            )


def _active_role(account: AccountRecord | None) -> Role | None:
    if account is None or account.status != AccountStatus.ACTIVE.value:
        return None
    try:
        return Role(account.role)
    except ValueError:
        return None
