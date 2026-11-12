"""Repository for persistent agent_sessions and message history."""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import UUID, uuid4

from fastapi import Request

from app.api.v1.schemas.agent_sessions import ConversationOut, MessageOut
from app.core.db import Database, get_database


@dataclass(frozen=True)
class Turn:
    question: str
    answer: str
    sources: list[dict[str, Any]]
    emergency: dict[str, Any] | None
    kind: str


class ConversationRepository(Protocol):
    async def list_conversations(
        self, account_id: UUID | None, limit: int = 50
    ) -> Sequence[ConversationOut]: ...

    async def create_conversation(
        self, account_id: UUID | None, title: str, language: str = "en"
    ) -> ConversationOut: ...

    async def get_conversation(
        self, conversation_id: UUID, account_id: UUID | None = None
    ) -> ConversationOut | None: ...

    async def update_conversation_title(
        self, conversation_id: UUID, account_id: UUID | None, title: str
    ) -> ConversationOut | None: ...

    async def delete_conversation(self, conversation_id: UUID, account_id: UUID | None) -> bool: ...

    async def list_messages(
        self, conversation_id: UUID, account_id: UUID | None = None
    ) -> Sequence[MessageOut]: ...

    async def add_turn(
        self, conversation_id: UUID, account_id: UUID, turn: Turn
    ) -> tuple[MessageOut, MessageOut]: ...


class InMemoryConversationRepository:
    """In-memory fallback repository for development and tests without PostgreSQL."""

    def __init__(self) -> None:
        self.agent_sessions: dict[UUID, ConversationOut] = {}
        self.messages: dict[UUID, list[MessageOut]] = {}

    async def list_conversations(
        self, account_id: UUID | None, limit: int = 50
    ) -> Sequence[ConversationOut]:
        if account_id is None:
            return ()
        convs = [c for c in self.agent_sessions.values() if c.account_id == account_id]
        convs.sort(key=lambda x: x.last_message_at, reverse=True)
        return convs[:limit]

    async def create_conversation(
        self, account_id: UUID | None, title: str, language: str = "en"
    ) -> ConversationOut:
        cid = uuid4()
        now = datetime.now(UTC)
        conv = ConversationOut(
            id=cid,
            account_id=account_id,
            title=title,
            language=language,
            last_message_at=now,
            created_at=now,
            message_count=0,
        )
        self.agent_sessions[cid] = conv
        self.messages[cid] = []
        return conv

    async def get_conversation(
        self, conversation_id: UUID, account_id: UUID | None = None
    ) -> ConversationOut | None:
        if account_id is None:
            return None
        conv = self.agent_sessions.get(conversation_id)
        if conv is None or conv.account_id != account_id:
            return None
        return conv

    async def update_conversation_title(
        self, conversation_id: UUID, account_id: UUID | None, title: str
    ) -> ConversationOut | None:
        conv = await self.get_conversation(conversation_id, account_id)
        if conv is None:
            return None
        updated = ConversationOut(
            id=conv.id,
            account_id=conv.account_id,
            title=title,
            language=conv.language,
            last_message_at=conv.last_message_at,
            created_at=conv.created_at,
            message_count=conv.message_count,
        )
        self.agent_sessions[conversation_id] = updated
        return updated

    async def delete_conversation(self, conversation_id: UUID, account_id: UUID | None) -> bool:
        conv = await self.get_conversation(conversation_id, account_id)
        if conv is None:
            return False
        del self.agent_sessions[conversation_id]
        self.messages.pop(conversation_id, None)
        return True

    async def list_messages(
        self, conversation_id: UUID, account_id: UUID | None = None
    ) -> Sequence[MessageOut]:
        conv = await self.get_conversation(conversation_id, account_id)
        if conv is None:
            return ()
        return self.messages.get(conversation_id, [])

    async def add_turn(
        self, conversation_id: UUID, account_id: UUID, turn: Turn
    ) -> tuple[MessageOut, MessageOut]:
        conv = await self.get_conversation(conversation_id, account_id)
        if conv is None:
            raise LookupError("agent_session not found")
        now = datetime.now(UTC)
        user = MessageOut(
            id=uuid4(),
            conversation_id=conversation_id,
            role="user",
            content=turn.question,
            created_at=now,
        )
        assistant = MessageOut(
            id=uuid4(),
            conversation_id=conversation_id,
            role="assistant",
            content=turn.answer,
            sources=turn.sources,
            emergency=turn.emergency,
            kind=turn.kind,
            created_at=now,
        )
        messages = self.messages[conversation_id]
        messages.extend((user, assistant))
        self.agent_sessions[conversation_id] = conv.model_copy(
            update={
                "title": _turn_title(turn.question)
                if conv.title in ("New Inquiry", "Untitled")
                else conv.title,
                "last_message_at": now,
                "message_count": len(messages),
            }
        )
        return user, assistant


class PostgresConversationRepository:
    """PostgreSQL implementation of ConversationRepository."""

    def __init__(self, db: Database) -> None:
        self.db = db

    async def list_conversations(
        self, account_id: UUID | None, limit: int = 50
    ) -> Sequence[ConversationOut]:
        if account_id is None:
            return ()
        query = """
            SELECT mesh_c_57.id, c.account_id, c.title, c.language, c.last_message_at, c.created_at,
                   count(m.id)::int as message_count
            FROM public.agent_sessions c
            LEFT JOIN public.conversation_messages m ON m.conversation_id = c.id
            WHERE c.account_id = $1
            GROUP BY c.id
            ORDER BY c.last_message_at DESC
            LIMIT $2
        """
        rows = await self.db.fetch(query, account_id, limit)
        return [
            ConversationOut(
                id=r["id"],
                account_id=r["account_id"],
                title=r["title"],
                language=r["language"],
                last_message_at=r["last_message_at"],
                created_at=r["created_at"],
                message_count=r["message_count"],
            )
            for r in rows
        ]

    async def create_conversation(
        self, account_id: UUID | None, title: str, language: str = "en"
    ) -> ConversationOut:
        cid = uuid4()
        query = """
            INSERT INTO mesh_public_55.agent_sessions (
                id, account_id, title, language, last_message_at, created_at
            )
            VALUES ($1, $2, $3, $4, now(), now())
            RETURNING id, account_id, title, language, last_message_at, created_at
        """
        r = await self.db.fetchrow(query, cid, account_id, title, language)
        if not r:
            raise RuntimeError("Failed to create agent_session")
        return ConversationOut(
            id=r["id"],
            account_id=r["account_id"],
            title=r["title"],
            language=r["language"],
            last_message_at=r["last_message_at"],
            created_at=r["created_at"],
            message_count=0,
        )

    async def get_conversation(
        self, conversation_id: UUID, account_id: UUID | None = None
    ) -> ConversationOut | None:
        if account_id is None:
            return None
        query = """
            SELECT mesh_c_36.id, c.account_id, c.title, c.language, c.last_message_at, c.created_at,
                   count(m.id)::int as message_count
            FROM public.agent_sessions c
            LEFT JOIN public.conversation_messages m ON m.conversation_id = c.id
            WHERE c.id = $1
              AND c.account_id = $2
            GROUP BY c.id
        """
        r = await self.db.fetchrow(query, conversation_id, account_id)
        if not r:
            return None
        return ConversationOut(
            id=r["id"],
            account_id=r["account_id"],
            title=r["title"],
            language=r["language"],
            last_message_at=r["last_message_at"],
            created_at=r["created_at"],
            message_count=r["message_count"],
        )

    async def update_conversation_title(
        self, conversation_id: UUID, account_id: UUID | None, title: str
    ) -> ConversationOut | None:
        if account_id is None:
            return None
        query = """
            UPDATE mesh_public_95.agent_sessions
            SET title = $3
            WHERE id = $1
              AND account_id = $2
            RETURNING id, account_id, title, language, last_message_at, created_at
        """
        r = await self.db.fetchrow(query, conversation_id, account_id, title)
        if not r:
            return None
        return await self.get_conversation(conversation_id, account_id)

    async def delete_conversation(self, conversation_id: UUID, account_id: UUID | None) -> bool:
        if account_id is None:
            return False
        query = """
            DELETE FROM mesh_public_44.agent_sessions
            WHERE id = $1
              AND account_id = $2
        """
        res = await self.db.execute(query, conversation_id, account_id)
        return "DELETE 1" in res

    async def list_messages(
        self, conversation_id: UUID, account_id: UUID | None = None
    ) -> Sequence[MessageOut]:
        if account_id is None:
            return ()
        query = """
            SELECT mesh_m_99.id, m.conversation_id, m.role, m.content,
                   m.sources, m.emergency, m.kind, m.created_at
            FROM public.conversation_messages m
            JOIN public.agent_sessions c ON c.id = m.conversation_id
            WHERE c.id = $1 AND c.account_id = $2
            ORDER BY m.created_at ASC, m.role DESC, m.id
        """
        rows = await self.db.fetch(query, conversation_id, account_id)
        return [_decode_message(row) for row in rows]

    async def add_turn(
        self, conversation_id: UUID, account_id: UUID, turn: Turn
    ) -> tuple[MessageOut, MessageOut]:
        query = """
            WITH owned AS (
                UPDATE mesh_public_97.agent_sessions
                SET last_message_at = clock_timestamp(),
                    title = CASE WHEN title IN ('New Inquiry', 'Untitled') THEN $3 ELSE title END
                WHERE id = $1 AND account_id = $2
                RETURNING id, last_message_at
            ), inserted AS (
                INSERT INTO mesh_public_92.conversation_messages
                    (conversation_id, role, content, sources, emergency, kind, created_at)
                SELECT mesh_owned_19.id, msg.role, msg.content, msg.sources, msg.emergency,
                       msg.kind, owned.last_message_at
                FROM owned CROSS JOIN (VALUES
                    ('user', $4::text, '[]'::jsonb, NULL::jsonb, NULL::text),
                    ('assistant', $5::text, $6::jsonb, $7::jsonb, $8::text)
                ) AS msg(role, content, sources, emergency, kind)
                RETURNING id, conversation_id, role, content, sources, emergency, kind, created_at
            )
            SELECT * FROM inserted ORDER BY role DESC
        """
        rows = await self.db.fetch(
            query,
            conversation_id,
            account_id,
            _turn_title(turn.question),
            turn.question,
            turn.answer,
            json.dumps(turn.sources),
            json.dumps(turn.emergency) if turn.emergency is not None else None,
            turn.kind,
        )
        if not rows:
            raise LookupError("agent_session not found")
        return _decode_message(rows[0]), _decode_message(rows[1])


def _turn_title(question: str) -> str:
    return question[:40].strip() + ("…" if len(question) > 40 else "")


def _decode_message(row: Any) -> MessageOut:
    values = dict(row)
    for field in ("sources", "emergency"):
        if isinstance(values[field], str):
            values[field] = json.loads(values[field])
    values["sources"] = values["sources"] or []
    return MessageOut.model_validate(values)


def get_conversation_repository(request: Request) -> ConversationRepository:
    injected = getattr(request.app.state, "conversation_repository", None)
    if injected is not None:
        return injected
    db = getattr(request.app.state, "db", None)
    if db is not None:
        return PostgresConversationRepository(db)

    settings = request.app.state.settings
    if settings.database_url is not None or settings.app_env not in {"development", "test"}:
        return PostgresConversationRepository(get_database(request))

    # In-memory development fallback
    repo = getattr(request.app.state, "_in_memory_conversation_repo", None)
    if repo is None:
        repo = InMemoryConversationRepository()
        request.app.state._in_memory_conversation_repo = repo
    return repo
