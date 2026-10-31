"""Structured JSON logging with field redaction.

Request and response bodies are never logged. Structured ``extra`` fields are the
supported way to attach context; values under sensitive keys are replaced with
``[REDACTED]`` recursively. Exception messages are formatted as-is, so code must
never place credentials or secrets in exception text.
"""

from __future__ import annotations

import json
import logging
import sys
from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any, Final

REDACTED: Final = "[REDACTED]"

_SENSITIVE_MARKERS: Final = (
    "authorization",
    "cookie",
    "password",
    "token",
    "secret",
    "api-key",
    "apikey",
    "credential",
)

_RESERVED_RECORD_KEYS: Final = frozenset(
    {
        "args",
        "asctime",
        "created",
        "exc_info",
        "exc_text",
        "filename",
        "funcName",
        "levelname",
        "levelno",
        "lineno",
        "message",
        "module",
        "msecs",
        "msg",
        "name",
        "pathname",
        "process",
        "processName",
        "relativeCreated",
        "stack_info",
        "taskName",
        "thread",
        "threadName",
    }
)

_APP_HANDLER_ATTR: Final = "_rengera_json_handler"

access_logger = logging.getLogger("app.access")


def is_sensitive_key(key: str) -> bool:
    """Return whether a log field name refers to a secret or credential."""
    normalised = key.strip().lower().replace("_", "-")
    return any(marker in normalised for marker in _SENSITIVE_MARKERS)


def redact(value: Any) -> Any:
    """Recursively redact sensitive keys in mappings and sequences."""
    if isinstance(value, Mapping):
        return {
            str(key): REDACTED if is_sensitive_key(str(key)) else redact(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple, set, frozenset)):
        return [redact(item) for item in value]
    return value


class JsonFormatter(logging.Formatter):
    """Render one JSON object per log record with redacted structured fields."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC)
            .isoformat(timespec="milliseconds")
            .replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in vars(record).items():
            if key in _RESERVED_RECORD_KEYS:
                continue
            payload[key] = REDACTED if is_sensitive_key(key) else redact(value)
        if record.exc_info:
            exc_type, _, _ = record.exc_info
            payload["exception"] = {
                "type": exc_type.__name__ if exc_type is not None else None,
                "stack": self.formatException(record.exc_info),
            }
        return json.dumps(payload, default=str, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    """Install the JSON root handler once and silence uvicorn's plain access log."""
    root = logging.getLogger()
    for handler in list(root.handlers):
        if getattr(handler, _APP_HANDLER_ATTR, False):
            root.removeHandler(handler)
    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(JsonFormatter())
    setattr(handler, _APP_HANDLER_ATTR, True)
    root.addHandler(handler)
    root.setLevel(level)
    logging.getLogger("uvicorn.access").disabled = True
    # Third-party HTTP clients log full request URLs, including query strings.
    # Keep them quiet; application access logs use route templates only.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def log_access(
    *,
    method: str,
    path_template: str,
    status_code: int,
    duration_ms: float,
    request_id: str,
    level: int = logging.INFO,
) -> None:
    """Emit one structured access-log record (never request bodies or query strings)."""
    access_logger.log(
        level,
        f"{method} {path_template} -> {status_code}",
        extra={
            "event": "request_completed",
            "request_id": request_id,
            "method": method,
            "path": path_template,
            "status": status_code,
            "duration_ms": round(duration_ms, 3),
        },
    )
