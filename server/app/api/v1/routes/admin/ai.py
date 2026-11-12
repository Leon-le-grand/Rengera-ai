"""Admin AI provider status, inspection, and non-destructive health checks."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.agents.policy import load_policy, select_answer_model
from app.api.v1.schemas.admin import (
    AiAttemptStatus,
    AiModelStatus,
    AiStatusResponse,
    AiTestRequest,
    AiTestResponse,
    AiWorkflowStatus,
)
from app.auth.dependencies import CurrentPrincipalDep, SettingsDep
from app.authorization.dependencies import require_permission
from app.authorization.permissions import Permission
from app.providers.base import ProviderNotConfiguredError

router = APIRouter(prefix="/admin/ai", tags=["admin-ai"])


@router.get(
    "/status",
    response_model=AiStatusResponse,
    operation_id="getAiProviderStatus",
    summary="Get active AI provider and model configuration status",
)
async def get_ai_status(
    request: Request,
    settings: SettingsDep,
    _principal: CurrentPrincipalDep,
    _auth: Annotated[None, Depends(require_permission(Permission.WORKFLOW_MANAGE))],
) -> AiStatusResponse:
    if settings.agent_policy_file.strip():
        try:
            policy = load_policy(settings.agent_policy_file.strip())
        except ProviderNotConfiguredError:
            return AiStatusResponse(
                provider="policy",
                model="",
                embedding_model="",
                status="unconfigured",
                max_context_tokens=0,
            )
        activity = getattr(request.app.state, "agent_activity", None)
        attempts = activity.recent(policy.version) if activity is not None else ()
        try:
            model_profile, provider_profile = select_answer_model(policy)
            latest = (
                activity.latest(policy.version, "answer", model_profile.id) if activity else None
            )
            model, provider = model_profile.model, provider_profile.id
            health = latest.outcome if latest else "unknown"
        except ProviderNotConfiguredError:
            model, provider, health = "", "unconfigured", "unconfigured"
        return AiStatusResponse(
            provider=provider,
            model=model,
            embedding_model="",
            status=health,
            max_context_tokens=0,
            policy_version=policy.version,
            models=[
                AiModelStatus(id=m.id, provider=m.provider, tasks=sorted(m.tasks))
                for m in policy.models
            ],
            recent_attempts=[
                AiAttemptStatus(
                    run_id=a.run_id,
                    task=a.task,
                    model_id=a.model_id,
                    outcome=a.outcome,
                    observed_at=a.observed_at,
                    reason=a.reason,
                )
                for a in attempts[:20]
            ],
            workflows=[
                AiWorkflowStatus(
                    task=w.task,
                    models=list(w.models),
                    allowed_tools=sorted(w.allowed_tools),
                    max_steps=w.max_steps,
                    max_model_calls=w.max_model_calls,
                    timeout_seconds=w.timeout_seconds,
                )
                for w in policy.workflows
            ],
        )
    return AiStatusResponse(
        provider="unconfigured",
        model="",
        embedding_model="",
        status="unconfigured",
        max_context_tokens=0,
    )


@router.post(
    "/test",
    response_model=AiTestResponse,
    operation_id="testAiProvider",
    summary="Report that live provider probes are disabled",
)
async def test_ai_provider(
    settings: SettingsDep,
    body: AiTestRequest,
    _principal: CurrentPrincipalDep,
    _auth: Annotated[None, Depends(require_permission(Permission.WORKFLOW_MANAGE))],
) -> AiTestResponse:
    return AiTestResponse(
        status="disabled",
        provider="disabled",
        latency_ms=0,
        response="Live provider tests are disabled pending authorization.",
    )
