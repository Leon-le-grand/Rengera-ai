"""Provider construction from server-only settings."""

from __future__ import annotations

from fastapi import Request

from app.agents.activity import AgentActivity
from app.agents.entitlements import EntitlementResolver, SystemEntitlementResolver
from app.auth.principal import Principal
from app.core.settings import Settings
from app.providers.base import ChatProvider, ProviderNotConfiguredError


def build_provider(
    settings: Settings,
    activity: AgentActivity | None = None,
    *,
    principal: Principal | None = None,
    entitlements: EntitlementResolver | None = None,
) -> ChatProvider | None:
    """Build an answer provider only from a versioned system policy."""
    if settings.agent_policy_file.strip():
        from app.agents.policy import load_policy
        from app.agents.routing import build_workflow_router

        policy = load_policy(settings.agent_policy_file.strip())
        allowed = None
        if principal is not None:
            workflow = next((item for item in policy.workflows if item.task == "answer"), None)
            if workflow is None:
                return None
            resolver = entitlements or SystemEntitlementResolver()
            allowed = resolver.resolve(principal, "answer", workflow.models).permitted_models
        return build_workflow_router(policy, activity, allowed, principal=principal)
    return None


def get_chat_provider(request: Request, principal: Principal) -> ChatProvider | None:
    """Return a test-injected provider or build one from app settings.

    An explicitly injected ``None`` intentionally disables the provider instead
    of falling back to ambient environment configuration.
    """
    if hasattr(request.app.state, "chat_provider"):
        return request.app.state.chat_provider
    settings: Settings | None = getattr(request.app.state, "settings", None)
    if settings is None:
        return None
    try:
        return build_provider(
            settings,
            getattr(request.app.state, "agent_activity", None),
            principal=principal,
            entitlements=getattr(request.app.state, "entitlements", None),
        )
    except ProviderNotConfiguredError:
        # Never fall back to a legacy provider when an explicit policy is invalid.
        return None
