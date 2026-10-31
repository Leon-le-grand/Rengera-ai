"""HTTP middleware: request IDs, response header propagation and access logging."""

from __future__ import annotations

import logging
import time

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import log_access
from app.core.request_context import (
    is_valid_request_id,
    new_request_id,
    reset_request_id,
    set_request_id,
)

logger = logging.getLogger("app.request")

_MAX_FALLBACK_PATH_LENGTH = 200


def resolve_request_id(incoming: str | None) -> str:
    """Reuse a sane client correlation ID, otherwise generate a UUID4."""
    return incoming if is_valid_request_id(incoming) else new_request_id()


def resolve_path_template(scope: Scope) -> str:
    """Return a log-safe route path.

    The raw query string is never included. Path parameter values are replaced
    with their placeholder names so identifiers or share tokens cannot leak into
    access logs. Unmatched requests log a fixed marker rather than user input.
    """
    route = scope.get("route")
    if route is None:
        return "<unmatched>"
    path = scope.get("path", "/")
    if not isinstance(path, str):
        return "/"
    for name, value in scope.get("path_params", {}).items():
        if value not in (None, ""):
            path = path.replace(str(value), f"{{{name}}}")
    return path[:_MAX_FALLBACK_PATH_LENGTH] or "/"


class RequestContextMiddleware:
    """Pure ASGI middleware binding a request ID and emitting one access log per request."""

    def __init__(self, app: ASGIApp, *, header_name: str) -> None:
        self.app = app
        self.header_name = header_name

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = resolve_request_id(Headers(scope=scope).get(self.header_name))
        state = scope.setdefault("state", {})
        state["request_id"] = request_id
        start = time.perf_counter()
        status_code = 500
        response_started = False
        token = set_request_id(request_id)

        async def send_with_request_id(message: Message) -> None:
            nonlocal response_started, status_code
            if message["type"] == "http.response.start":
                response_started = True
                status_code = int(message["status"])
                MutableHeaders(scope=message)[self.header_name] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "unhandled_exception",
                extra={
                    "event": "unhandled_exception",
                    "request_id": request_id,
                    "method": scope.get("method", ""),
                    "path": resolve_path_template(scope),
                    "status": 500,
                    "duration_ms": round(duration_ms, 3),
                },
            )
            raise
        else:
            if response_started:
                duration_ms = (time.perf_counter() - start) * 1000
                log_access(
                    method=str(scope.get("method", "")),
                    path_template=resolve_path_template(scope),
                    status_code=status_code,
                    duration_ms=duration_ms,
                    request_id=request_id,
                )
        finally:
            reset_request_id(token)
