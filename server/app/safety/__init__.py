"""Deterministic safety routing and localized citizen messages."""

from app.safety.emergency import (
    EmergencyContact,
    EmergencyGuidance,
    detect_emergency,
    emergency_guidance,
    render_emergency_text,
)
from app.safety.guards import (
    greeting_reply,
    help_reply,
    is_greeting,
    is_help_request,
)
from app.safety.messages import (
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
