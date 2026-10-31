"""OpenAI-compatible ``POST /chat/completions`` adapter.

Design constraints:

* the model ID comes from settings and is never hard-coded in a feature;
* requests are non-streaming and bounded by ``max_tokens``;
* there are no retries that could double-charge a completion. The only retry is
  one immediate retry after ``httpx.ConnectTimeout``, which means the connection
  was never established and no completion request could have been billed.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Final

import httpx

from app.providers.base import (
    ChatMessage,
    ProviderUnavailableError,
)

HARD_MAX_COMPLETION_TOKENS: Final = 900
_TIMEOUT_ERROR = "The legal assistant provider timed out."
_FAILURE_ERROR = "The legal assistant provider is unavailable."
_INVALID_RESPONSE = "The legal assistant provider returned an invalid response."


class OpenAICompatibleProvider:
    """Non-streaming client for an OpenAI-compatible chat-completions endpoint."""

    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        api_key: str | None,
        timeout_seconds: float,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds
        self._transport = transport

    async def complete(
        self,
        messages: Sequence[ChatMessage],
        *,
        max_tokens: int,
        temperature: float,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self._model,
            "messages": [
                {"role": message.role, "content": message.content}
                for message in messages
            ],
            "temperature": max(0.0, min(temperature, 2.0)),
            "max_tokens": max(1, min(max_tokens, HARD_MAX_COMPLETION_TOKENS)),
            "stream": False,
        }
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        timeout = httpx.Timeout(self._timeout_seconds)
        async with httpx.AsyncClient(
            timeout=timeout, transport=self._transport
        ) as client:
            response = await self._post_with_single_connect_retry(
                client,
                f"{self._base_url}/chat/completions",
                headers=headers,
                payload=payload,
            )

        if response.is_error:
            raise ProviderUnavailableError(_FAILURE_ERROR)

        try:
            body = response.json()
        except ValueError as exc:
            raise ProviderUnavailableError(_INVALID_RESPONSE) from exc

        content = _extract_content(body)
        if not content:
            raise ProviderUnavailableError(_INVALID_RESPONSE)
        return content

    async def _post_with_single_connect_retry(
        self,
        client: httpx.AsyncClient,
        url: str,
        *,
        headers: dict[str, str],
        payload: dict[str, Any],
    ) -> httpx.Response:
        attempts = 2
        for attempt in range(attempts):
            try:
                return await client.post(url, headers=headers, json=payload)
            except httpx.ConnectTimeout as exc:
                if attempt + 1 < attempts:
                    continue
                raise ProviderUnavailableError(_TIMEOUT_ERROR) from exc
            except httpx.TimeoutException as exc:
                raise ProviderUnavailableError(_TIMEOUT_ERROR) from exc
            except httpx.HTTPError as exc:
                raise ProviderUnavailableError(_FAILURE_ERROR) from exc
        raise ProviderUnavailableError(_FAILURE_ERROR)


def _extract_content(body: object) -> str:
    if not isinstance(body, dict):
        return ""
    choices = body.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    first = choices[0]
    if not isinstance(first, dict):
        return ""
    message = first.get("message")
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                parts.append(part["text"])
        return "".join(parts).strip()
    return ""
