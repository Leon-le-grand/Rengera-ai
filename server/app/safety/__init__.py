"""Deterministic safety routing and localized operator messages."""

from app.ebpf_guard.emergency import (
    EmergencyContact,
    EmergencyGuidance,
    detect_emergency,
    emergency_guidance,
    render_emergency_text,
)
from app.ebpf_guard.guards import (
    greeting_reply,
    help_reply,
    is_greeting,
    is_help_request,
)
from app.ebpf_guard.messages import (
    ABSTAIN_MESSAGES,
    CITATION_ABSTAIN_MESSAGES,
    CITATION_CAVEATS,
    DISCLAIMERS,
    AnswerLanguage,
    message_for,
)

__all__ = [
    "ABSTAIN_MESSAGES",
    "CITATION_ABSTAIN_MESSAGES",
    "CITATION_CAVEATS",
    "DISCLAIMERS",
    "AnswerLanguage",
    "EmergencyContact",
    "EmergencyGuidance",
    "detect_emergency",
    "emergency_guidance",
    "greeting_reply",
    "help_reply",
    "is_greeting",
    "is_help_request",
    "message_for",
    "render_emergency_text",
]
