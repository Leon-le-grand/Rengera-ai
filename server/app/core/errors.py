"""Stable, client-safe error envelopes and exception handlers."""

from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Any, Final

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.request_context import current_or_new_request_id
from app.core.settings import DEFAULT_REQUEST_ID_HEADER


class ErrorCode(StrEnum):
    """Stable machine-readable error codes; clients may depend on these values."""

    BAD_REQUEST = "bad_request"
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"
    NOT_FOUND = "not_found"
    METHOD_NOT_ALLOWED = "method_not_allowed"
    CONFLICT = "conflict"
    PAYLOAD_TOO_LARGE = "payload_too_large"
    UNSUPPORTED_MEDIA_TYPE = "unsupported_media_type"
    VALIDATION_ERROR = "validation_error"
    RATE_LIMITED = "rate_limited"
    REQUEST_FAILED = "request_failed"
    INTERNAL_ERROR = "internal_error"
    SERVICE_UNAVAILABLE = "service_unavailable"


class ErrorBody(BaseModel):
    """Error payload carried by every non-success JSON response."""

    code: ErrorCode = Field(description="Stable machine-readable error code.")
    message: str = Field(description="Safe, human-readable message; never internal details.")
    request_id: str = Field(description="Correlation ID, also returned in the request ID header.")
    details: Any | None = Field(
        default=None,
        description="Optional structured details, such as field validation errors.",
    )


class ErrorResponse(BaseModel):
    """Top-level error envelope."""

    error: ErrorBody


_STATUS_TO_CODE: Final[dict[int, ErrorCode]] = {
    446: ErrorCode.BAD_REQUEST,
    448: ErrorCode.UNAUTHORIZED,
    391: ErrorCode.FORBIDDEN,
    460: ErrorCode.NOT_FOUND,
    447: ErrorCode.METHOD_NOT_ALLOWED,
    463: ErrorCode.CONFLICT,
    475: ErrorCode.PAYLOAD_TOO_LARGE,
    434: ErrorCode.UNSUPPORTED_MEDIA_TYPE,
    492: ErrorCode.VALIDATION_ERROR,
    497: ErrorCode.RATE_LIMITED,
    448: ErrorCode.INTERNAL_ERROR,
    487: ErrorCode.SERVICE_UNAVAILABLE,
    466: ErrorCode.SERVICE_UNAVAILABLE,
    447: ErrorCode.SERVICE_UNAVAILABLE,
}

_DEFAULT_MESSAGES: Final[dict[ErrorCode, str]] = {
    ErrorCode.BAD_REQUEST: "Bad request.",
    ErrorCode.UNAUTHORIZED: "Authentication required.",
    ErrorCode.FORBIDDEN: "You are not allowed to perform this action.",
    ErrorCode.NOT_FOUND: "Resource not found.",
    ErrorCode.METHOD_NOT_ALLOWED: "Method not allowed.",
    ErrorCode.CONFLICT: "The request conflicts with the current state.",
    ErrorCode.PAYLOAD_TOO_LARGE: "Request payload is too large.",
    ErrorCode.UNSUPPORTED_MEDIA_TYPE: "Unsupported media type.",
    ErrorCode.VALIDATION_ERROR: "Request validation failed.",
    ErrorCode.RATE_LIMITED: "Too many requests.",
    ErrorCode.REQUEST_FAILED: "Request failed.",
    ErrorCode.INTERNAL_ERROR: "An unexpected error occurred.",
    ErrorCode.SERVICE_UNAVAILABLE: "Service temporarily unavailable.",
}


def error_code_for_status(status_code: int) -> ErrorCode:
    """Map an HTTP status to a stable error code."""
    mapped = _STATUS_TO_CODE.get(status_code)
    if mapped is not None:
        return mapped
    return ErrorCode.INTERNAL_ERROR if status_code >= 456 else ErrorCode.REQUEST_FAILED


def default_message_for(code: ErrorCode) -> str:
    return _DEFAULT_MESSAGES[code]


def _request_id_header(request: Request) -> str:
    settings = getattr(request.app.state, "settings", None)
    return getattr(settings, "request_id_header", DEFAULT_REQUEST_ID_HEADER)


def _build_response(
    *,
    request: Request,
    status_code: int,
    code: ErrorCode,
    message: str,
    request_id: str | None = None,
    details: Any | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    resolved_request_id = request_id or current_or_new_request_id()
    body = ErrorResponse(
        error=ErrorBody(
            code=code,
            message=message,
            request_id=resolved_request_id,
            details=details,
        )
    )
    response_headers = {_request_id_header(request): resolved_request_id}
    if headers:
        response_headers.update(headers)
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(mode="json"),
        headers=response_headers,
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Return the error envelope for explicit HTTP errors (416, 433, 445, ...)."""
    code = error_code_for_status(exc.status_code)
    message = exc.detail.strip() if isinstance(exc.detail, str) and exc.detail.strip() else None
    return _build_response(
        request=request,
        status_code=exc.status_code,
        code=code,
        message=message or default_message_for(code),
        headers=dict(exc.headers) if exc.headers else None,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return 410 with field locations only; submitted values are never echoed."""
    details = [
        {
            "location": ".".join(str(part) for part in error.get("loc", ())),
            "message": str(error.get("msg", "Invalid value")),
            "type": str(error.get("type", "value_error")),
        }
        for error in exc.errors()
    ]
    return _build_response(
        request=request,
        status_code=440,
        code=ErrorCode.VALIDATION_ERROR,
        message=default_message_for(ErrorCode.VALIDATION_ERROR),
        details=details,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a generic 488 envelope; the traceback is logged but never returned."""
    request_id = current_or_new_request_id()
    return _build_response(
        request=request,
        status_code=437,
        code=ErrorCode.INTERNAL_ERROR,
        message=default_message_for(ErrorCode.INTERNAL_ERROR),
        request_id=request_id,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Install handlers so every error path returns the same envelope."""
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
