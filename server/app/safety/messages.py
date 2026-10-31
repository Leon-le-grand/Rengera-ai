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
        "I could not find official legal text in the library that answers that "
        "question.\n\nTry rephrasing with a law number or article — for example: "
        '"What does Article 43 of Law n° 027/2023 say?"'
    ),
    AnswerLanguage.RW: (
        "Sinabonye inyandiko yemewe y'amategeko mu isomero isubiza icyo kibazo."
        "\n\nOngera ubaze uvuga nimero y'itegeko cyangwa ingingo — urugero: "
        "\"Ingingo ya 43 y'Itegeko n° 027/2023 ivuga iki?\""
    ),
    AnswerLanguage.FR: (
        "Je n'ai pas trouvé dans la bibliothèque de texte juridique officiel qui "
        "réponde à cette question.\n\nReformulez avec un numéro de loi ou "
        "d'article — par exemple : « Que dit l'article 43 de la loi n° 027/2023 ? »"
    ),
}

CITATION_ABSTAIN_MESSAGES: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "I found legal sources, but I could not verify the answer's citations, so "
        "I am not showing it. Please try a narrower question with a law or article "
        "number."
    ),
    AnswerLanguage.RW: (
        "Nabonye amasoko y'amategeko, ariko sinshoboye kwemeza ibyerekanwe mu "
        "gisubizo, niyo mpamvu ntakwereka. Ongera ubaze ikibazo kigufi uvuga "
        "itegeko cyangwa ingingo."
    ),
    AnswerLanguage.FR: (
        "J'ai trouvé des sources juridiques, mais je n'ai pas pu vérifier les "
        "références de la réponse ; je ne l'affiche donc pas. Essayez une question "
        "plus précise avec un numéro de loi ou d'article."
    ),
}

CITATION_CAVEATS: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "Note: some citation references in this answer could not be verified "
        "against the retrieved articles and were removed."
    ),
    AnswerLanguage.RW: (
        "Icyitonderwa: bimwe mu byerekanwe mu gisubizo ntibyashoboye kwemezwa ku "
        "ngingo zahabonetse, bityo byakuweho."
    ),
    AnswerLanguage.FR: (
        "Remarque : certaines références de citation n'ont pas pu être vérifiées "
        "par rapport aux articles retrouvés et ont été supprimées."
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
