"""Code-registered tools with per-call permission and budget enforcement."""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from app.auth.principal import Principal
from app.authorization.permissions import Permission, has_permission


class ToolDeniedError(Exception):
    """The call is not permitted by the active policy or principal."""


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    name: str
    permission: Permission
    arguments: type[BaseModel]
    authorize_scope: Callable[[Principal, BaseModel], Awaitable[bool]]
    execute: Callable[[Principal, BaseModel], Awaitable[Any]]
    mutates: bool = False


@dataclass(slots=True)
class ToolBudget:
    remaining_steps: int


class ToolGateway:
    """Validate a code-registered tool at every call; never execute arbitrary code."""

    def __init__(self, definitions: Mapping[str, ToolDefinition]) -> None:
        self._definitions = dict(definitions)

    async def invoke(
        self,
        *,
        name: str,
        payload: dict[str, Any],
        principal: Principal,
        allowed_tools: frozenset[str],
        budget: ToolBudget,
    ) -> Any:
        tool = self._definitions.get(name)
        if (
            tool is None
            or name not in allowed_tools
            or budget.remaining_steps <= 0
            or not has_permission(principal.permissions, tool.permission)
            or tool.mutates
        ):
            raise ToolDeniedError("Tool call denied")
        arguments = tool.arguments.model_validate(payload)
        # Reserve before the first await so concurrent calls cannot share a step.
        budget.remaining_steps -= 1
        if not await tool.authorize_scope(principal, arguments):
            raise ToolDeniedError("Tool call denied")
        return await tool.execute(principal, arguments)
