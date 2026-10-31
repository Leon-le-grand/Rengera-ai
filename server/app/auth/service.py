"""Session creation, validation and revocation.

Every request re-loads the account and its role from ``app_users``. Token role
claims, cookies and query parameters cannot grant permissions.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.auth.errors import AuthenticationError
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
from app.auth.supabase_tokens import AccessTokenVerifier
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

    async def create_session(
        self,
        access_token: str,
        verifier: AccessTokenVerifier,
    ) -> CreatedSession:
        """Exchange a verified Supabase token for a new server session."""
        token = await asyncio.to_thread(verifier.verify, access_token.strip())
        account = await self._accounts.get_by_auth_user_id(token.auth_user_id)
        role = _active_role(account)
        if account is None or role is None:
            reason = "account_not_found" if account is None else "account_inactive_or_role_invalid"
            logger.warning(
                "session_creation_rejected",
                extra={"event": "session_creation_rejected", "reason": reason},
            )
            raise AuthenticationError(reason)

        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=self._settings.session_ttl_seconds)
        session_token = generate_session_token()
        csrf_token = generate_csrf_token()
        principal = Principal(
            account_id=account.id,
            auth_user_id=account.auth_user_id,
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
            auth_user_id=account.auth_user_id,
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
