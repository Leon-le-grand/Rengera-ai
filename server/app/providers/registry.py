"""Provider construction from server-only settings."""

from __future__ import annotations

from fastapi import Request

from app.core.settings import Settings
from app.providers.base import ChatProvider
from app.providers.openai_compatible import OpenAICompatibleProvider


def build_provider(settings: Settings) -> ChatProvider | None:
    """Build the configured provider, or ``None`` when base URL/model are absent.

    ``AI_MODEL`` is mandatory. An API key is optional because some
    OpenAI-compatible gateways authenticate at the network layer; when present it
    is sent only in the Authorization header and never included in prompts.
    """
    base_url = settings.ai_base_url.strip()
    model = settings.ai_model.strip()
    if not base_url or not model:
        return None
    api_key = (
        settings.ai_api_key.get_secret_value().strip()
        if settings.ai_api_key is not None
        else None
    )
    return OpenAICompatibleProvider(
        base_url=base_url,
        model=model,
        api_key=api_key or None,
        timeout_seconds=settings.ai_timeout_seconds,
    )


def get_chat_provider(request: Request) -> ChatProvider | None:
    """Return a test-injected provider or build one from app settings.

    An explicitly injected ``None`` intentionally disables the provider instead
    of falling back to ambient environment configuration.
    """
    if hasattr(request.app.state, "chat_provider"):
        return request.app.state.chat_provider
    settings: Settings | None = getattr(request.app.state, "settings", None)
    if settings is None:
        return None
    return build_provider(settings)
