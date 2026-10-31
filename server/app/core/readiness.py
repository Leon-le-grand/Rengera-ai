"""Readiness checks for the services an API instance needs to do useful work.

Only checks that are actually implemented are registered. Database, auth and
provider probes belong to the modules that own those dependencies; register them
with ``app.state.readiness.register(...)`` when they exist.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from enum import StrEnum

from pydantic import BaseModel, Field

from app.core.settings import Settings, missing_required_settings

logger = logging.getLogger("app.readiness")


class CheckStatus(StrEnum):
    OK = "ok"
    UNAVAILABLE = "unavailable"


class CheckResult(BaseModel):
    status: CheckStatus
    detail: str | None = Field(
        default=None,
        description="Safe explanation for operators; never contains secret values.",
    )


class ReadinessReport(BaseModel):
    status: CheckStatus
    checks: dict[str, CheckResult]


Probe = Callable[[], Awaitable[CheckResult]]


class ReadinessRegistry:
    """Named async probes evaluated in registration order."""

    def __init__(self) -> None:
        self._probes: dict[str, Probe] = {}

    def register(self, name: str, probe: Probe) -> None:
        if not name.strip():
            raise ValueError("readiness check name must not be empty")
        self._probes[name] = probe

    async def run(self) -> ReadinessReport:
        checks: dict[str, CheckResult] = {}
        for name, probe in self._probes.items():
            try:
                checks[name] = await probe()
            except Exception:
                logger.exception(
                    "readiness_check_failed",
                    extra={"event": "readiness_check_failed", "check": name},
                )
                checks[name] = CheckResult(
                    status=CheckStatus.UNAVAILABLE, detail="check failed"
                )
        status = (
            CheckStatus.OK
            if all(result.status is CheckStatus.OK for result in checks.values())
            else CheckStatus.UNAVAILABLE
        )
        return ReadinessReport(status=status, checks=checks)


def create_config_probe(settings: Settings) -> Probe:
    """Probe the only foundation dependency that exists today: validated settings."""

    async def probe() -> CheckResult:
        missing = missing_required_settings(settings)
        if missing:
            return CheckResult(
                status=CheckStatus.UNAVAILABLE,
                detail="missing configuration: " + ", ".join(missing),
            )
        return CheckResult(status=CheckStatus.OK)

    return probe
