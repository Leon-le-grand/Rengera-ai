"""Process-local evidence from regular workflow traffic."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

HEALTH_WINDOW = timedelta(minutes=15)

AttemptOutcome = Literal["healthy", "unavailable"]


@dataclass(frozen=True)
class ModelAttempt:
    policy_version: str
    run_id: UUID
    task: str
    model_id: str
    outcome: AttemptOutcome
    observed_at: datetime
    reason: Literal["timeout", "provider_failure"] | None = None


class AgentActivity:
    """Bounded, redacted observations without user input or model output."""

    def __init__(self) -> None:
        self._attempts: deque[ModelAttempt] = deque(maxlen=100)

    def record(
        self,
        version: str,
        run_id: UUID,
        task: str,
        model_id: str,
        outcome: AttemptOutcome,
        reason: Literal["timeout", "provider_failure"] | None = None,
    ) -> None:
        self._attempts.append(
            ModelAttempt(version, run_id, task, model_id, outcome, datetime.now(UTC), reason)
        )

    def recent(self, version: str) -> tuple[ModelAttempt, ...]:
        return tuple(
            attempt for attempt in reversed(self._attempts) if attempt.policy_version == version
        )

    def latest(self, version: str, task: str, model_id: str) -> ModelAttempt | None:
        cutoff = datetime.now(UTC) - HEALTH_WINDOW
        return next(
            (
                attempt
                for attempt in self.recent(version)
                if attempt.task == task
                and attempt.model_id == model_id
                and attempt.observed_at >= cutoff
            ),
            None,
        )
