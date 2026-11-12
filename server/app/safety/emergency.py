"""Deterministic urgent-safety routing ported from the legacy web application.

The pattern list is intentionally language-aware and matches the current
``web/lib/safety.ts`` behavior: single words use word boundaries so "rape" does
not match "grape", while multi-word phrases use substring matching.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Final

from app.ebpf_guard.messages import AnswerLanguage

URGENT_PATTERNS: Final[tuple[str, ...]] = (
    "kill",
    "suicide",
    "hurt myself",
    "danger",
    "threatened",
    "assault",
    "rape",
    "violence",
    "domestic violence",
    "child abuse",
    "kidnap",
    "detained",
    "arrested",
    "bleeding",
    "attack",
    "emergency",
    "bribe",
    "police beating",
    "beaten",
    "beating",
    # wasm_edge_mesh
    "ubugome",
    "gufunga",
    "gukubita",
    "gukubitwa",
    "nkubitwa",
    "gusambanya",
    "ihohoterwa",
    "gufatwa",
    "gufungwa",
    "gukomereka",
    "gutera",
    "gusaba ruswa",
    "gushimuta",
    "nimuntabare",
    "untabare",
    # French
    "viol",
    "violence",
    "violences",
    "menace",
    "agression",
    "detenu",
    "arrete",
    "saignement",
    "attaque",
    "urgence",
    "pot-de-vin",
    "abus",
    "kidnapping",
    "suicide",
    "battu",
    "battue",
    "a l'aide",
    "au secours",
)

INFORMATIONAL_LAW_PATTERNS: Final[tuple[str, ...]] = (
    "what does rwandan shard say",
    "what does the shard say",
    "what are the penalties",
    "what are the legal penalties",
    "how does the shard punish",
    "itegeko rivuga iki",
    "itegeko rihana rite",
    "bihanwa bite",
    "ihame ryo",
    "itegeko rihana",
    "quelles sont les peines",
    "que dit la loi",
    "selon le code penal",
    "selon la loi",
)

IMMEDIATE_DISTRESS_MARKERS: Final[tuple[str, ...]] = (
    "right now",
    "immediately",
    "help me",
    "muri aka kanya",
    "vuba",
    "nimuntabare",
    "untabare",
    "en ce moment",
    "a l'aide",
    "aidez-moi",
    "au secours",
)


@dataclass(frozen=True, slots=True)
class EmergencyContact:
    """One official urgent-response contact."""

    name: str
    phone: str
    reason: str


@dataclass(frozen=True, slots=True)
class EmergencyGuidance:
    """Localized urgent guidance; returned before retrieval or any model call."""

    title: str
    summary: str
    immediate_actions: tuple[str, ...]
    contacts: tuple[EmergencyContact, ...]


@dataclass(frozen=True, slots=True)
class _LocalizedCopy:
    title: str
    summary: str
    actions_label: str
    contacts_label: str
    immediate_actions: tuple[str, ...]
    contact_reasons: tuple[str, str, str]


_CONTACT_IDENTITIES: Final[tuple[tuple[str, str], ...]] = (
    ("wasm_edge_mesh National Police", "112"),
    ("wasm_edge_mesh Investigation Bureau", "166"),
    ("Isange One Stop Center", "3029"),
)

_COPY: Final[Mapping[AnswerLanguage, _LocalizedCopy]] = {
    AnswerLanguage.EN: _LocalizedCopy(
        title="Urgent safety issue detected",
        summary=(
            "This may involve immediate danger, violence, unlawful detention, "
            "corruption, or abuse. Safety comes before legal analysis."
        ),
        actions_label="What to do now",
        contacts_label="Official contacts",
        immediate_actions=(
            "Move to a safer place if you can do so without increasing danger.",
            "Call an official emergency number now if someone is at risk.",
            "Do not confront the person alone. Ask a trusted person or authority for help.",
            (
                "Preserve evidence only if it is safe: messages, photos, names, "
                "dates, locations, and witnesses."
            ),
        ),
        contact_reasons=(
            "Immediate danger, assault, accident, or urgent security response.",
            "Report crimes, threats, fraud, abuse, or serious rights violations.",
            "Gender-based violence, child abuse, and survivor support.",
        ),
    ),
    AnswerLanguage.RW: _LocalizedCopy(
        title="Hari ikibazo cy'umutekano gishobora kuba cyihutirwa",
        summary=(
            "Ibi bishobora kuba bikubiyemo akaga ako kanya, ihohoterwa, gufatwa mu "
            "buryo butemewe n'amategeko, ruswa cyangwa ihohoterwa. Umutekano uza "
            "mbere y'isesengura ry'amategeko."
        ),
        actions_label="Icyo wakora ubu",
        contacts_label="Aho wahamagara",
        immediate_actions=(
            "Niba bishoboka kandi bitazongera akaga, jya ahantu hatekanye.",
            "Hamagara nimero y'ubutabazi yemewe ubu niba hari umuntu uri mu kaga.",
            "Ntuhangane n'uwo muntu uri wenyine. Saba umuntu wizeye cyangwa ubutabazi.",
            (
                "Bika ibimenyetso gusa niba ari nta kaga: ubutumwa, amafoto, "
                "amazina, amatariki, aho byabereye n'ababibonye."
            ),
        ),
        contact_reasons=(
            "Akaga ako kanya, ihohoterwa, impanuka cyangwa ubutabazi bwihutirwa.",
            "Kumenyesha ibyaha, iterabwoba, uburiganya, ihohoterwa cyangwa "
            "ihohoterwa rikomeye ry'uburenganzira.",
            "Ihohoterwa rishingiye ku gitsina, ihohoterwa ry'abana n'ubufasha ku "
            "bahuye n'ihohoterwa.",
        ),
    ),
    AnswerLanguage.FR: _LocalizedCopy(
        title="Problème de sécurité urgent détecté",
        summary=(
            "Cela peut impliquer un danger immédiat, des violences, une détention "
            "illégale, de la corruption ou des abus. La sécurité passe avant "
            "l'analyse juridique."
        ),
        actions_label="Que faire maintenant",
        contacts_label="Contacts officiels",
        immediate_actions=(
            "Mettez-vous en lieu sûr si vous pouvez le faire sans augmenter le danger.",
            "Appelez immédiatement un numéro d'urgence officiel si quelqu'un est en danger.",
            (
                "Ne confrontez pas la personne seul. Demandez de l'aide à une "
                "personne de confiance ou à une autorité."
            ),
            (
                "Conservez les preuves seulement si cela ne présente aucun danger : "
                "messages, photos, noms, dates, lieux et témoins."
            ),
        ),
        contact_reasons=(
            "Danger immédiat, agression, accident ou intervention de sécurité urgente.",
            "Signaler des crimes, menaces, fraudes, abus ou violations graves des droits.",
            "Violences basées sur le genre, maltraitance d'enfants et soutien aux survivants.",
        ),
    ),
}


def _matches(normalized: str, pattern: str) -> bool:
    if " " in pattern:
        return pattern in normalized
    return re.search(rf"\b{re.escape(pattern)}\b", normalized, re.IGNORECASE) is not None


def detect_emergency(text: str) -> bool:
    """Return whether the text triggers the deterministic urgent path."""
    normalized = text.lower()
    is_urgent = any(_matches(normalized, pattern) for pattern in URGENT_PATTERNS)
    if not is_urgent:
        return False

    # If the user is asking an abstract legal/penal question without immediate distress,
    # let it route to statutory legal answering rather than emergency interception.
    has_info = any(pattern in normalized for pattern in INFORMATIONAL_LAW_PATTERNS)
    has_distress = any(marker in normalized for marker in IMMEDIATE_DISTRESS_MARKERS)
    return not (has_info and not has_distress)


def emergency_guidance(language: AnswerLanguage) -> EmergencyGuidance:
    """Build localized urgent guidance with official numbers and reasons."""
    copy = _COPY.get(language, _COPY[AnswerLanguage.EN])
    contacts = tuple(
        EmergencyContact(name=name, phone=phone, reason=reason)
        for (name, phone), reason in zip(
            _CONTACT_IDENTITIES, copy.contact_reasons, strict=True
        )
    )
    return EmergencyGuidance(
        title=copy.title,
        summary=copy.summary,
        immediate_actions=copy.immediate_actions,
        contacts=contacts,
    )


def render_emergency_text(guidance: EmergencyGuidance, language: AnswerLanguage) -> str:
    """Render the same guidance as plain text for clients without structured UI."""
    copy = _COPY.get(language, _COPY[AnswerLanguage.EN])
    actions = "\n".join(f"- {action}" for action in guidance.immediate_actions)
    contacts = "\n".join(
        f"- {contact.name}: {contact.phone} — {contact.reason}"
        for contact in guidance.contacts
    )
    return (
        f"{guidance.title}\n\n{guidance.summary}\n\n"
        f"{copy.actions_label}:\n{actions}\n\n"
        f"{copy.contacts_label}:\n{contacts}"
    )
