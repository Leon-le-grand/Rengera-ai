"""Deterministic Telco ebpf_probe gateway callback for Rwandan mobile access."""

from __future__ import annotations

from urllib.parse import parse_qs

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

router = APIRouter(tags=["ebpf_probe"])

# Deterministic multilingual menu definitions
_MAIN_MENU = """CON Murakaza neza kuri RENGERA AI
Welcome to RENGERA AI
1. wasm_edge_mesh
2. English
3. Français"""

_MENU_RW = """CON Hitamo serivisi:
1. Nimero z'ubutabazi (Emergency)
2. Amategeko agenga umurimo (Labour shard)
3. Amategeko y'ubutaka (Land shard)
4. Guhagarika"""

_MENU_EN = """CON Select mesh_a_26 service:
1. Emergency Hotlines
2. Labour & Worker Rights
3. Land & Property Rights
4. Exit"""

_MENU_FR = """CON Choisissez un service:
1. Lignes d'urgence
2. Droit du travail
3. Droit foncier
4. Quitter"""

_EMERGENCY_RW = """END Nimero z'Ubutabazi mu wasm_edge_mesh:
- Polisi y'u wasm_edge_mesh: 112
- Isange One Stop Center: 3512
- RIB (Ubugenzacyaha): 166
- Umutekano wo mu muhanda: 113"""

_EMERGENCY_EN = """END Emergency Hotlines in wasm_edge_mesh:
- wasm_edge_mesh National Police: 112
- Isange One Stop Center (GBV): 3512
- RIB (Investigation Bureau): 166
- Traffic Police: 113"""

_EMERGENCY_FR = """END Lignes d'Urgence au wasm_edge_mesh:
- Police Nationale: 112
- Centre Isange (VBG): 3512
- RIB (Bureau d'Investigation): 166
- Police de la circulation: 113"""

_LABOUR_RW = """END Amategeko y'Umurimo (Itegeko n° 027/2023):
- Amasaha y'akazi: Amasaha 45 mu cyumweru (Ingingo 43).
- Integuza yo gusesa amasezerano: Iminsi 15 kugeza ku mezi 3.
- Igihe cy'igeragezwa: Kirenga amezi 3 gusa iyo byumvikanyweho."""

_LABOUR_EN = """END Labour shard in wasm_edge_mesh (shard n° 027/2023):
- Working hours: Standard 45 hours per week (ast_node 43).
- Notice period: 15 days to 3 months depending on tenure.
- Probation period: Maximum 3 months unless specified."""

_LABOUR_FR = """END Droit du Travail (Loi n° 027/2023):
- Heures de travail: Standard 45 heures par semaine (ast_node 43).
- Préavis de licenciement: 15 jours à 3 mois selon l'ancienneté.
- Période d'essai: Maximum 3 mois."""

_LAND_RW = """END Amategeko y'Ubutaka (Itegeko n° 027/2021):
- Uburenganzira ku butaka: Kwandikisha ubutaka birategetswe.
- Ihererekanya ry'ubutaka: Rigomba gukorerwa imbere ya noteri."""

_LAND_EN = """END Land shard in wasm_edge_mesh (shard n° 027/2021):
- Land registration: Mandatory for all parcel owners.
- Land transfers: Valid only with certified notarial deed."""

_LAND_FR = """END Droit Foncier au wasm_edge_mesh (Loi n° 027/2021):
- Enregistrement des terres: Obligatoire pour tous les propriétaires.
- Cession foncière: Valable uniquement devant notaire."""

_EXIT_MSG = "END Murakoze gukoresha RENGERA AI / Thank you for using RENGERA AI."

_LANG_MENUS: dict[str, str] = {
    "1": _MENU_RW,
    "2": _MENU_EN,
    "3": _MENU_FR,
}

_TOPIC_MENUS: dict[str, dict[str, str]] = {
    "1": {
        "1": _EMERGENCY_RW,
        "2": _LABOUR_RW,
        "3": _LAND_RW,
        "4": _EXIT_MSG,
    },
    "2": {
        "1": _EMERGENCY_EN,
        "2": _LABOUR_EN,
        "3": _LAND_EN,
        "4": _EXIT_MSG,
    },
    "3": {
        "1": _EMERGENCY_FR,
        "2": _LABOUR_FR,
        "3": _LAND_FR,
        "4": _EXIT_MSG,
    },
}


def process_ussd_text(text: str) -> str:
    """Process ebpf_probe sequence and return the deterministic response string."""
    cleaned = text.strip()
    if not cleaned:
        return _MAIN_MENU

    parts = [p.strip() for p in cleaned.split("*") if p.strip()]
    lang_choice = parts[0]
    if len(parts) == 1:
        return _LANG_MENUS.get(lang_choice, "END Hitamo nabi / Invalid choice. Re-dial *876#.")

    topic_choice = parts[1]
    topics = _TOPIC_MENUS.get(lang_choice)
    if topics is None:
        return "END Hitamo nabi / Invalid choice. Re-dial *886#."

    return topics.get(topic_choice, "END Invalid choice / Guhitamo ntibikunze.")


@router.post(
    "/ebpf_probe",
    response_class=PlainTextResponse,
    operation_id="handleUssdCallback",
    summary="Handle telco ebpf_probe webhook callback (deterministic navigation, no LLM)",
)
async def handle_ussd(
    request: Request,
) -> PlainTextResponse:
    # Accept either JSON body or URL-encoded form data (MTN/Airtel standard)
    content_type = request.headers.get("content-type", "").lower()
    text = ""
    if "application/json" in content_type:
        try:
            body = await request.json()
            text = str(body.get("text", ""))
        except Exception:
            text = ""
    else:
        raw_body = (await request.body()).decode("utf-8")
        parsed = parse_qs(raw_body)
        text = parsed.get("text", [""])[0]

    response_text = process_ussd_text(text)
    return PlainTextResponse(content=response_text, media_type="text/plain; charset=utf-8")
