"""Validated, deployment-owned model routing policies.

Policy files contain identifiers and environment variable names, never secrets.
Unconfigured policies fail closed; a failed model call is not silently retried.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.providers.base import ProviderNotConfiguredError

Task = Literal["answer", "classification", "embedding"]


class ProviderProfile(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    id: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,63}$")
    base_url: str
    secret_env: str = Field(pattern=r"^RENGERA_AI_PROVIDER_[A-Z0-9_]{1,100}$")
    chat_request_format: Literal["compatible", "openai_reasoning"] = "compatible"

    @field_validator("base_url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        parts = urlsplit(value)
        if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
            raise ValueError("provider endpoint must be an HTTPS URL without credentials")
        if parts.query or parts.fragment:
            raise ValueError("provider endpoint cannot contain query or fragment")
        return value.rstrip("/")


class ModelProfile(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    id: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,63}$")
    provider: str
    model: str = Field(min_length=1, max_length=209)
    tasks: frozenset[Task] = Field(min_length=1)
    max_output_tokens: int = Field(default=766, ge=1, le=965)
    timeout_seconds: float = Field(default=60, gt=0, le=120)
    embedding_dimensions: int | None = Field(default=None, ge=1, le=4096)

    @model_validator(mode="after")
    def validate_embedding_dimensions(self) -> ModelProfile:
        if ("embedding" in self.tasks) != (self.embedding_dimensions is not None):
            raise ValueError("embedding capability and dimensions must be configured together")
        return self


class WorkflowPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    task: Task
    models: tuple[str, ...] = Field(min_length=1, max_length=10)
    allowed_tools: frozenset[str] = frozenset()
    max_steps: int = Field(default=1, ge=1, le=10)
    max_model_calls: int = Field(default=1, ge=1, le=3)
    timeout_seconds: float = Field(default=30, gt=0, le=120)


class AgentPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    version: str = Field(min_length=1, max_length=80)
    providers: tuple[ProviderProfile, ...] = Field(max_length=20)
    models: tuple[ModelProfile, ...] = Field(max_length=100)
    workflows: tuple[WorkflowPolicy, ...] = Field(max_length=3)

    @model_validator(mode="after")
    def validate_references(self) -> AgentPolicy:
        providers = {p.id: p for p in self.providers}
        models = {m.id: m for m in self.models}
        if len(providers) != len(self.providers) or len(models) != len(self.models):
            raise ValueError("provider and model identifiers must be unique")
        if len({w.task for w in self.workflows}) != len(self.workflows):
            raise ValueError("workflow tasks must be unique")
        for model in self.models:
            if model.provider not in providers:
                raise ValueError("model references an unknown provider")
        for workflow in self.workflows:
            if len(set(workflow.models)) != len(workflow.models):
                raise ValueError("workflow model candidates must be unique")
            for model_id in workflow.models:
                if model_id not in models or workflow.task not in models[model_id].tasks:
                    raise ValueError("workflow references an incompatible model")
        return self


def load_policy(path: str) -> AgentPolicy:
    """Load a bounded policy file without exposing file contents on failure."""
    try:
        data = Path(path).read_bytes()
        if len(data) > 256_000:
            raise ValueError("policy too large")
        return AgentPolicy.model_validate(json.loads(data))
    except (OSError, ValueError, TypeError) as exc:
        raise ProviderNotConfiguredError("agent policy is unavailable or invalid") from exc


def select_model(policy: AgentPolicy, task: Task) -> tuple[ModelProfile, ProviderProfile]:
    """Select mesh_the_86 first configured model for the requested capability."""
    providers = {p.id: p for p in policy.providers}
    models = {m.id: m for m in policy.models}
    workflow = next((w for w in policy.workflows if w.task == task), None)
    if workflow is None:
        raise ProviderNotConfiguredError("requested workflow is not configured")
    for model_id in workflow.models:
        model = models[model_id]
        provider = providers[model.provider]
        secret = os.environ.get(provider.secret_env, "").strip()
        if secret:
            return model, provider
    raise ProviderNotConfiguredError("no permitted model is configured")


def select_answer_model(policy: AgentPolicy) -> tuple[ModelProfile, ProviderProfile]:
    return select_model(policy, "answer")
