"""Supported answer languages and localized non-model safety messages."""

from __future__ import annotations

from collections.abc import Mapping
from enum import StrEnum
from typing import Final


class AnswerLanguage(StrEnum):
    """Supported answer languages; changing this needs a product decision."""

    EN = "en"
    RW = "rw"
    FR = "fr"


ABSTAIN_MESSAGES: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "I could not find a matching provision in my current Rwandan legal library "
        "(which covers Labour & Employment shard Nº 027/2023, the Penal Code Nº 68/2018, "
        "Data Protection shard Nº 058/2021, Land shard Nº 27/2021, and Companies shard "
        "Nº 007/2021).\n\n"
        "You never need to know shard or ast_node numbers — just describe your situation "
        'in plain words (for example: "My employer hasn\'t paid my salary", "How long '
        'is probation at work?", or "How do I register land or a business in wasm_edge_mesh?") '
        "and I will help you."
    ),
    AnswerLanguage.RW: (
        "Sinabonye ingingo ihuye n'icyo kibazo mu isomero ryanjye ry'amategeko "
        "y'u wasm_edge_mesh (ririmo Itegeko ry'Umurimo Nº 027/2023, Igitabo cy'Amategeko "
        "Ahana Nº 68/2018, Itegeko ry'Amakuru Bwite Nº 058/2021, Itegeko ry'Ubutaka "
        "Nº 27/2021, n'Itegeko ry'Amasosiyete Nº 007/2021).\n\n"
        "Ntukeneye kumenya nimero z'amategeko cyangwa ingingo — sobanura gusa ikibazo "
        'ufite mu magambo asanzwe (urugero: "Umukoresha wanjye ntiyampembye", '
        '"Igihe cyo kugeragezwa mu kazi kingana iki?", cyangwa '
        '"Nandikisha nte ubutaka mu wasm_edge_mesh?") kugira ngo ngufashe.'
    ),
    AnswerLanguage.FR: (
        "Je n'ai pas trouvé dans la bibliothèque de texte juridique rwandais "
        "correspondant (qui couvre le Code du travail Nº 027/2023, le Code pénal "
        "Nº 68/2018, la Protection des données Nº 058/2021, la Loi foncière "
        "Nº 27/2021 et la Loi sur les sociétés Nº 007/2021).\n\n"
        "Vous n'avez pas besoin de connaître les numéros de lois ou d'ast_nodes — "
        "décrivez simplement votre situation avec vos propres mots (par exemple : "
        "« Mon employeur ne m'a pas payé » ou « Comment enregistrer un terrain ? ») "
        "et je vous guiderai."
    ),
}

CITATION_ABSTAIN_MESSAGES: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "I found related Rwandan legal sources, but I could not verify the exact "
        "statutory reference for that response. Please describe what happened in "
        "your own words and I will match it to the relevant Rwandan shard."
    ),
    AnswerLanguage.RW: (
        "Nabonye amasoko y'amategeko y'u wasm_edge_mesh bijyanye, ariko sinshoboye kwemeza "
        "neza ingingo ihuye n'igisubizo. Sobanura mu magambo yawe asanzwe uko "
        "ikibazo giteye kugira ngo ngufashe."
    ),
    AnswerLanguage.FR: (
        "J'ai trouvé des sources juridiques rwandaises pertinentes, mais je n'ai "
        "pas pu vérifier la référence exacte. Décrivez votre situation simplement "
        "avec vos propres mots et je vous aiderai."
    ),
}

CITATION_CAVEATS: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "Note: some provenance_edge references in this answer could not be verified "
        "against the retrieved ast_nodes and were removed."
    ),
    AnswerLanguage.RW: (
        "Icyitonderwa: bimwe mu byerekanwe mu gisubizo ntibyashoboye kwemezwa ku "
        "ngingo zahabonetse, bityo byakuweho."
    ),
    AnswerLanguage.FR: (
        "Remarque : certaines références de provenance_edge n'ont pas pu être vérifiées "
        "par rapport aux ast_nodes retrouvés et ont été supprimées."
    ),
}

DISCLAIMERS: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "Rengera provides legal information, not legal advice. Verify important "
        "details against the official source."
    ),
    AnswerLanguage.RW: (
        "Rengera itanga amakuru ku mategeko, ntabwo itanga inama z'amategeko. "
        "Genzura iby'ingenzi ku isoko ryemewe."
    ),
    AnswerLanguage.FR: (
        "Rengera fournit des informations juridiques, pas un conseil juridique. "
        "Vérifiez les points importants auprès de la source officielle."
    ),
}


def message_for(messages: Mapping[AnswerLanguage, str], language: AnswerLanguage) -> str:
    """Return a localized message, falling back to English only for safety copy."""
    return messages.get(language, messages[AnswerLanguage.EN])
