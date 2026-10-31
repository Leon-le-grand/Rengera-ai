"""FastAPI application factory and ASGI entrypoint.

Run locally with ``uv run uvicorn app.main:app --reload``. Tests and tooling call
``create_app(settings)`` with explicit settings to avoid ambient environment drift.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.v1.router import API_V1_PREFIX, api_v1_router
from app.auth.session_tokens import CSRF_HEADER_NAME
from app.core.db import Database
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.core.readiness import (
    CheckResult,
    CheckStatus,
    ReadinessRegistry,
    create_config_probe,
)
from app.core.settings import Settings, get_settings

logger = logging.getLogger("app.lifespan")

CORS_ALLOW_METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Configure logging, open the database pool and log lifecycle events."""
    settings: Settings = app.state.settings
    configure_logging(settings.log_level)
    app.state.db = None
    if settings.database_url is not None:
        try:
            app.state.db = await Database.connect(settings)
        except Exception:
            # A database outage must not crash-loop the API process. Readiness
            # reports unavailable and repositories fail closed with 503.
            logger.exception(
                "database_pool_unavailable",
                extra={"event": "database_pool_unavailable"},
            )
    logger.info(
        "application_started",
        extra={
            "event": "application_started",
            "app_env": settings.app_env,
            "app_version": settings.app_version,
            "database_configured": settings.database_url is not None,
        },
    )
    try:
        yield
    finally:
        database: Database | None = app.state.db
        if database is not None:
            await database.close()
        logger.info("application_stopped", extra={"event": "application_stopped"})


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the API application. Settings validation happens before construction."""
    resolved = settings if settings is not None else get_settings()

    app = FastAPI(
        title=resolved.app_name,
        version=resolved.app_version,
        lifespan=lifespan,
    )
    app.state.settings = resolved

    readiness = ReadinessRegistry()
    readiness.register("config", create_config_probe(resolved))
    if resolved.database_url is not None:

        async def database_probe() -> CheckResult:
            database: Database | None = getattr(app.state, "db", None)
            if database is None:
                return CheckResult(
                    status=CheckStatus.UNAVAILABLE,
                    detail="database pool is not connected",
                )
            try:
                healthy = await database.ping()
            except Exception:
                logger.exception(
                    "database_readiness_failed",
                    extra={"event": "database_readiness_failed"},
                )
                return CheckResult(
                    status=CheckStatus.UNAVAILABLE,
                    detail="database query failed",
                )
            if not healthy:
                return CheckResult(
                    status=CheckStatus.UNAVAILABLE,
                    detail="database ping returned an unexpected result",
                )
            return CheckResult(status=CheckStatus.OK)

        readiness.register("database", database_probe)
    app.state.readiness = readiness

    register_exception_handlers(app)

    # Last added is outermost: CORS wraps request context so error responses keep headers.
    app.add_middleware(RequestContextMiddleware, header_name=resolved.request_id_header)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved.cors_origins),
        allow_credentials=True,
        allow_methods=list(CORS_ALLOW_METHODS),
        allow_headers=[
            "Authorization",
            "Content-Type",
            CSRF_HEADER_NAME,
            resolved.request_id_header,
        ],
        expose_headers=[resolved.request_id_header],
        max_age=600,
    )

    app.include_router(health_router)
    app.include_router(api_v1_router, prefix=API_V1_PREFIX)
    return app


app = create_app()
