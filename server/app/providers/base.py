"""Provider protocol and safe, typed failure classes."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


class ProviderError(RuntimeError):
    """Base class for provider failures that must not become an abstention."""


class ProviderNotConfiguredError(ProviderError):
    """The server has no usable provider/model configuration for this task."""


class ProviderUnavailableError(ProviderError):
    """The configured provider timed out, errored, or returned an invalid shape."""


@dataclass(frozen=True, slots=True)
class ChatMessage:
    """One chat message passed to a provider adapter."""

    role: str
    content: str


class ChatProvider(Protocol):
    """Minimal non-streaming chat interface; no tools or credentials are passed."""

    async def complete(
        self,
        messages: tuple[ChatMessage, ...] | list[ChatMessage],
        *,
        max_tokens: int,
        temperature: float,
    ) -> str: ...
