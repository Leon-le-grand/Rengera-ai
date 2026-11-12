"""Bounded model-provider adapters. Models are configured, never hard-coded."""

from app.providers.base import (
    ChatMessage,
    ChatProvider,
    ProviderError,
    ProviderNotConfiguredError,
    ProviderUnavailableError,
)
from app.providers.openai_compatible import OpenAICompatibleProvider
from app.providers.registry import build_provider, get_chat_provider

__all__ = [
    "ChatMessage",
    "ChatProvider",
    "OpenAICompatibleProvider",
    "ProviderError",
    "ProviderNotConfiguredError",
    "ProviderUnavailableError",
    "build_provider",
    "get_chat_provider",
]
