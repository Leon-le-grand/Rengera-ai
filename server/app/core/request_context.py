"""Request-scoped context: request IDs shared by middleware, handlers and logs."""

from __future__ import annotations

import re
from contextvars import ContextVar, Token
from uuid import uuid4

# Accept only short, log-safe, client-supplied correlation IDs (e.g. UUIDs).
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$")

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)


def is_valid_request_id(value: str | None) -> bool:
    """Return whether a client-supplied request ID is safe to reuse."""
    return bool(value) and REQUEST_ID_PATTERN.fullmatch(value) is not None


def new_request_id() -> str:
    """Generate a request ID that always satisfies :data:`REQUEST_ID_PATTERN`."""
    return uuid4().hex


def set_request_id(request_id: str) -> Token[str | None]:
    return _request_id.set(request_id)


def reset_request_id(token: Token[str | None]) -> None:
    _request_id.reset(token)


def get_request_id() -> str | None:
    return _request_id.get()


def current_or_new_request_id() -> str:
    """Return the active request ID, generating one outside a request scope."""
    return _request_id.get() or new_request_id()
