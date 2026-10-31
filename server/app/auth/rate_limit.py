"""Small process-local limiter for session-creation attempts.

This is **not distributed**: each API worker has its own buckets and a restart
clears them. A shared store is required before relying on this across replicas.
The key is the socket/client address supplied by the ASGI server; trusted proxy
header handling is a deployment concern and must not be inferred from arbitrary
``X-Forwarded-For`` values.
"""

from __future__ import annotations

import time
from typing import Final

SESSION_CREATE_MAX_ATTEMPTS: Final = 10
SESSION_CREATE_WINDOW_SECONDS: Final = 60.0


def client_ip(request_client_host: str | None) -> str:
    """Return a rate-limit key for the direct peer address."""
    return request_client_host or "unknown"


class InMemorySessionCreationRateLimiter:
    """Fixed-window limiter for session creation attempts."""

    def __init__(
        self,
        *,
        max_attempts: int = SESSION_CREATE_MAX_ATTEMPTS,
        window_seconds: float = SESSION_CREATE_WINDOW_SECONDS,
        max_keys: int = 10_000,
    ) -> None:
        if max_attempts < 1:
            raise ValueError("max_attempts must be at least 1")
        if window_seconds <= 0:
            raise ValueError("window_seconds must be greater than 0")
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds
        self._max_keys = max_keys
        self._attempts: dict[str, list[float]] = {}

    def allow(self, key: str) -> bool:
        """Consume one attempt and return whether the caller may proceed."""
        now = time.monotonic()
        cutoff = now - self._window_seconds
        attempts = [stamp for stamp in self._attempts.get(key, []) if stamp > cutoff]
        if len(attempts) >= self._max_attempts:
            self._attempts[key] = attempts
            return False
        attempts.append(now)
        self._attempts[key] = attempts
        if len(self._attempts) > self._max_keys:
            self._prune(cutoff)
        return True

    def _prune(self, cutoff: float) -> None:
        stale = [
            key
            for key, attempts in self._attempts.items()
            if not attempts or attempts[-1] <= cutoff
        ]
        for key in stale:
            del self._attempts[key]
        while len(self._attempts) > self._max_keys:
            oldest = next(iter(self._attempts))
            del self._attempts[oldest]
