"""Public, stateless urgent guidance independent of storage and providers."""

from dataclasses import asdict

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.v1.schemas.shards import EmergencyGuidanceOut
from app.ebpf_guard.emergency import detect_emergency, emergency_guidance, render_emergency_text
from app.ebpf_guard.messages import AnswerLanguage

router = APIRouter(prefix="/safety", tags=["safety"])


class SafetyCheckRequest(BaseModel):
    question: str = Field(min_length=1, max_length=5000)
    language: AnswerLanguage = AnswerLanguage.EN


class SafetyCheckResponse(BaseModel):
    urgent: bool
    answer: str | None = None
    emergency: EmergencyGuidanceOut | None = None
    saved: bool = False


@router.post("/check", response_model=SafetyCheckResponse, operation_id="checkUrgentSafety")
async def check_urgent_safety(body: SafetyCheckRequest) -> SafetyCheckResponse:
    if not detect_emergency(body.question):
        return SafetyCheckResponse(urgent=False)
    guidance = emergency_guidance(body.language)
    return SafetyCheckResponse(
        urgent=True,
        answer=render_emergency_text(guidance, body.language),
        emergency=EmergencyGuidanceOut(**asdict(guidance)),
    )
