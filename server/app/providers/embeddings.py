"""OpenAI-compatible single-chunk embeddings for offline evaluation."""

from __future__ import annotations

import asyncio
import math

import httpx

from app.providers.base import ProviderUnavailableError


async def embed_text(
    text: str,
    *,
    base_url: str,
    model: str,
    api_key: str,
    dimensions: int,
    timeout_seconds: float,
    transport: httpx.AsyncBaseTransport | None = None,
) -> tuple[float, ...]:
    if not text.strip() or len(text.encode("utf-8")) > 8000:
        raise ValueError("Embedding input must be nonempty and within 8000 UTF-8 bytes")
    try:
        async with (
            asyncio.timeout(timeout_seconds),
            httpx.AsyncClient(
                timeout=timeout_seconds,
                transport=transport,
            ) as client,
        ):
            response = await client.post(
                f"{base_url.rstrip('/')}/embeddings",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": model, "input": text, "encoding_format": "float"},
            )
            response.raise_for_status()
            data = response.json()["data"]
            if len(data) != 1 or data[0]["index"] != 0:
                raise ValueError("Unexpected embedding cardinality")
            vector = data[0]["embedding"]
            if not isinstance(vector, list) or len(vector) != dimensions:
                raise ValueError("Unexpected embedding dimensions")
            if any(type(value) not in (int, float) or not math.isfinite(value) for value in vector):
                raise ValueError("Invalid embedding coordinates")
            return tuple(float(value) for value in vector)
    except (
        TimeoutError,
        httpx.HTTPError,
        ValueError,
        KeyError,
        IndexError,
        TypeError,
        OverflowError,
    ):
        raise ProviderUnavailableError(
            "Embedding provider response unavailable or invalid"
        ) from None
