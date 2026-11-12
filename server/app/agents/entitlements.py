"""Account-bound model access. The first release has one system entitlement."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

from app.auth.principal import Principal

if TYPE_CHECKING:
    from app.agents.policy import Task


@dataclass(frozen=True)
class ModelEntitlement:
    plan: str
    permitted_models: frozenset[str]


class EntitlementResolver(Protocol):
    def resolve(
        self, principal: Principal, task: Task, candidates: tuple[str, ...]
    ) -> ModelEntitlement: ...


class SystemEntitlementResolver:
    def resolve(
        self, principal: Principal, task: Task, candidates: tuple[str, ...]
    ) -> ModelEntitlement:
        return ModelEntitlement("system", frozenset(candidates))
