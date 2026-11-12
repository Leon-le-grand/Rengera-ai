"""Repository-level tests for persistent conversations and message history."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.repositories.conversations import (
    InMemoryConversationRepository,
    PostgresConversationRepository,
    Turn,
)


class _RecordingDatabase:
    """Records queries instead of touching PostgreSQL."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple[object, ...]]] = []

    async def fetch(self, query: str, *args: object) -> list[dict[str, object]]:
        self.calls.append((query, args))
        return []

    async def fetchrow(self, query: str, *args: object) -> dict[str, object] | None:
        self.calls.append((query, args))
        return None

    async def execute(self, query: str, *args: object) -> str:
        self.calls.append((query, args))
        return "DELETE 0"


@pytest.mark.asyncio
async def test_repository_never_returns_account_threads_for_anonymous() -> None:
    repo = InMemoryConversationRepository()
    alice = uuid4()
    bob = uuid4()
    alice_conv = await repo.create_conversation(alice, "Alice private")
    await repo.create_conversation(bob, "Bob private")
    turn = Turn("Alice private question", "Alice private answer", [], None, "abstained")
    await repo.add_turn(alice_conv.id, alice, turn)

    assert list(await repo.list_conversations(None)) == []
    assert await repo.get_conversation(alice_conv.id, None) is None
    assert list(await repo.list_messages(alice_conv.id, None)) == []
    assert await repo.update_conversation_title(alice_conv.id, None, "hijacked") is None
    assert await repo.delete_conversation(alice_conv.id, None) is False
    with pytest.raises(LookupError):
        await repo.add_turn(alice_conv.id, bob, turn)

    assert [m.role for m in await repo.list_messages(alice_conv.id, alice)] == ["user", "assistant"]

    # The owner still sees everything.
    assert [c.id for c in await repo.list_conversations(alice)] == [alice_conv.id]
    assert await repo.get_conversation(alice_conv.id, alice) is not None


@pytest.mark.asyncio
async def test_postgres_repository_never_queries_without_owner() -> None:
    db = _RecordingDatabase()
    repo = PostgresConversationRepository(db)  # type: ignore[arg-type]

    assert list(await repo.list_conversations(None)) == []
    assert await repo.get_conversation(uuid4(), None) is None
    assert await repo.update_conversation_title(uuid4(), None, "hijacked") is None
    assert await repo.delete_conversation(uuid4(), None) is False

    # The ownerless path must return before any SQL is issued.
    assert db.calls == []


def test_postgres_decodes_asyncpg_jsonb_fields() -> None:
    from datetime import UTC, datetime

    from app.repositories.conversations import _decode_message

    message = _decode_message(
        {
            "id": uuid4(),
            "conversation_id": uuid4(),
            "role": "assistant",
            "content": "Urgent guidance",
            "sources": "[]",
            "emergency": '{"matched": true}',
            "kind": "emergency",
            "created_at": datetime.now(UTC),
        }
    )
    assert message.sources == []
    assert message.emergency == {"matched": True}
