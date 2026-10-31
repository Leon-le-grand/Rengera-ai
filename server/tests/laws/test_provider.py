"""OpenAI-compatible adapter: bounded request, auth and one connect retry."""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest

from app.core.settings import Settings
from app.providers.base import (
    ChatMessage,
    ProviderUnavailableError,
)
from app.providers.openai_compatible import OpenAICompatibleProvider
from app.providers.registry import build_provider


def _provider(
    handler: httpx.MockTransport | None = None,
    *,
    api_key: str | None = "secret-key",
) -> OpenAICompatibleProvider:
    return OpenAICompatibleProvider(
        base_url="https://ai.example.test/v1",
        model="configured-model",
        api_key=api_key,
        timeout_seconds=3,
        transport=handler,
    )


async def test_request_uses_configured_model_and_bounded_non_streaming_body() -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["authorization"] = request.headers.get("authorization")
        captured["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "  grounded answer  "}}]},
        )

    provider = _provider(httpx.MockTransport(handler))
    result = await provider.complete(
        [ChatMessage(role="system", content="rules")],
        max_tokens=10_000,
        temperature=5,
    )

    assert result == "grounded answer"
    assert captured["url"] == "https://ai.example.test/v1/chat/completions"
    assert captured["authorization"] == "Bearer secret-key"
    body = captured["body"]
    assert body["model"] == "configured-model"
    assert body["stream"] is False
    assert body["max_tokens"] == 900
    assert body["temperature"] == 2.0
    assert body["messages"] == [{"role": "system", "content": "rules"}]


async def test_missing_api_key_sends_no_authorization_header() -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["authorization"] = request.headers.get("authorization")
        return httpx.Response(
            200, json={"choices": [{"message": {"content": "ok"}}]}
        )

    provider = _provider(httpx.MockTransport(handler), api_key=None)
    assert await provider.complete(
        [ChatMessage(role="user", content="question")],
        max_tokens=100,
        temperature=0.2,
    ) == "ok"
    assert captured["authorization"] is None


async def test_content_array_is_flattened() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": [
                                {"type": "text", "text": "part one "},
                                {"type": "text", "text": "part two"},
                            ]
                        }
                    }
                ]
            },
        )

    provider = _provider(httpx.MockTransport(handler))
    assert (
        await provider.complete(
            [ChatMessage(role="user", content="q")], max_tokens=10, temperature=0
        )
        == "part one part two"
    )


async def test_connect_timeout_retries_exactly_once() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise httpx.ConnectTimeout("connection never opened", request=request)
        return httpx.Response(
            200, json={"choices": [{"message": {"content": "after retry"}}]}
        )

    provider = _provider(httpx.MockTransport(handler))
    result = await provider.complete(
        [ChatMessage(role="user", content="q")], max_tokens=10, temperature=0
    )

    assert result == "after retry"
    assert attempts == 2


async def test_connect_timeout_twice_stops_after_one_retry() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        raise httpx.ConnectTimeout("connection never opened", request=request)

    provider = _provider(httpx.MockTransport(handler))
    with pytest.raises(ProviderUnavailableError):
        await provider.complete(
            [ChatMessage(role="user", content="q")], max_tokens=10, temperature=0
        )
    assert attempts == 2


async def test_read_timeout_is_not_retried() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        raise httpx.ReadTimeout("response timed out", request=request)

    provider = _provider(httpx.MockTransport(handler))
    with pytest.raises(ProviderUnavailableError):
        await provider.complete(
            [ChatMessage(role="user", content="q")], max_tokens=10, temperature=0
        )
    assert attempts == 1


async def test_server_error_is_not_retried() -> None:
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        return httpx.Response(500, json={"error": "boom"})

    provider = _provider(httpx.MockTransport(handler))
    with pytest.raises(ProviderUnavailableError):
        await provider.complete(
            [ChatMessage(role="user", content="q")], max_tokens=10, temperature=0
        )
    assert attempts == 1


async def test_malformed_response_and_empty_content_are_unavailable() -> None:
    def malformed(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="not json")

    def empty(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": []})

    with pytest.raises(ProviderUnavailableError):
        await _provider(httpx.MockTransport(malformed)).complete(
            [ChatMessage(role="user", content="q")], max_tokens=10, temperature=0
        )
    with pytest.raises(ProviderUnavailableError):
        await _provider(httpx.MockTransport(empty)).complete(
            [ChatMessage(role="user", content="q")], max_tokens=10, temperature=0
        )


def test_registry_requires_base_url_and_model() -> None:
    configured = Settings(
        app_env="test",
        ai_base_url="https://ai.example.test/v1",
        ai_model="configured-model",
        ai_api_key=None,
        _env_file=None,
    )
    missing_model = Settings(
        app_env="test",
        ai_base_url="https://ai.example.test/v1",
        ai_model="",
        _env_file=None,
    )

    assert build_provider(configured) is not None
    assert build_provider(missing_model) is None


def test_registry_returns_none_for_default_empty_settings() -> None:
    settings = Settings(app_env="test", _env_file=None)
    assert build_provider(settings) is None
