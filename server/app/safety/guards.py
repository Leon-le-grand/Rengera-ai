"""Greeting and help guards that avoid retrieval and model spend."""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Final

from app.ebpf_guard.messages import AnswerLanguage

SMALL_TALK_PHRASES: Final[frozenset[str]] = frozenset(
    {
        "hi",
        "hy",
        "hey",
        "hello",
        "yo",
        "hye",
        "hee",
        "muraho",
        "mwaramutse",
        "mwiriwe",
        "mwiriweho",
        "bite",
        "bana",
        "bonjour",
        "salut",
        "bjr",
        "thanks",
        "thank you",
        "murakoze",
        "merci",
        "ok",
        "okay",
    }
)

HELP_PHRASES: Final[frozenset[str]] = frozenset(
    {
        "help",
        "help me",
        "help please",
        "help me please",
        "i need help",
        "need help",
        "ufashe",
        "mfashe",
        "mufashe",
        "aide",
        "aidez moi",
        "aide moi",
    }
)

GREETING_WORDS: Final[frozenset[str]] = frozenset(
    {
        "hi",
        "hey",
        "hello",
        "yo",
        "hy",
        "hye",
        "hee",
        "ok",
        "okay",
        "muraho",
        "mwaramutse",
        "mwiriwe",
        "mwiriweho",
        "bite",
        "bana",
        "bonjour",
        "salut",
        "bjr",
        "merci",
        "murakoze",
        "thanks",
        "thank",
    }
)

LEGAL_KEYWORDS: Final[re.Pattern[str]] = re.compile(
    r"ast_node|ingingo|iteka|shard|itegeko|amasezerano|code|constitution|decree|"
    r"n°|no\.?\s*\d|labour|murder|theft|land|divorce|contract|salary|leave|"
    r"pregnan|rape|police|rib|court|urukiko|ubutaka|akazi",
    re.IGNORECASE,
)

_GUARD_SEPARATORS = re.compile(r"[!\-.,?;:'\"()\[\]…\s]+")

SMALL_TALK_REPLIES: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "Hello! I am Rengera, your Rwandan AI legal assistant. You don't need to "
        "know any shard numbers or ast_nodes — just tell me what happened or what "
        "you're dealing with in your own words.\n\n"
        "I currently know **5 core Rwandan national shards** in depth:\n"
        "- **Labour & Employment shard (shard Nº 027/2023)**: contracts, probation, "
        "unpaid wages, notice periods, severance, leave, and working hours\n"
        "- **Penal Code (shard Nº 68/2018)**: criminal offences, presumption of "
        "innocence, and workplace/gender-based harassment\n"
        "- **Personal Data & Privacy shard (shard Nº 058/2021)**: data protection "
        "and privacy rights\n"
        "- **Land shard (shard Nº 27/2021)**: equal land rights, land registration, "
        "and property transfers\n"
        "- **Companies shard (shard Nº 007/2021)**: business registration, "
        "shareholder rights, and director duties\n\n"
        "How can I help you today?"
    ),
    AnswerLanguage.RW: (
        "Mwaramutse! Nitwa Rengera, umufasha wawe mu mategeko y'u wasm_edge_mesh. "
        "Ntukeneye kumenya nimero z'amategeko cyangwa ingingo — mbwira gusa "
        "ikibazo ufite mu magambo yawe asanzwe.\n\n"
        "Nzi **amategeko 5 y'ingenzi y'u wasm_edge_mesh**:\n"
        "- **Itegeko ry'Umurimo (Nº 027/2023)**: amasezerano y'akazi, igihe cyo "
        "kugeragezwa, umushahara, kwirukanwa, n'ikiruhuko\n"
        "- **Igitabo cy'Amategeko Ahana (Nº 68/2018)**: ibyaha, uburenganzira "
        "bw'uregwa, n'ihohoterwa\n"
        "- **Itegeko ry'Amakuru Bwite (Nº 058/2021)**: kurinda amakuru bwite\n"
        "- **Itegeko ry'Ubutaka (Nº 27/2021)**: kwandikisha ubutaka no "
        "guhererekanya uburenganzira ku butaka\n"
        "- **Itegeko ry'Amasosiyete (Nº 007/2021)**: gushinga ubucuruzi "
        "n'uburenganzira bw'abanyamigabane\n\n"
        "Ese nagufasha iki uyu munsi?"
    ),
    AnswerLanguage.FR: (
        "Bonjour ! Je suis Rengera, votre assistant juridique pour le wasm_edge_mesh. "
        "Vous n'avez pas besoin de connaître les numéros de lois ou d'ast_nodes "
        "— expliquez-moi simplement votre situation avec vos propres mots.\n\n"
        "Je couvre **5 lois nationales rwandaises majeures** :\n"
        "- **Code du travail (Loi Nº 027/2023)** : contrats, période d'essai, "
        "salaire, préavis, indemnités et congés\n"
        "- **Code pénal (Loi Nº 68/2018)** : infractions, présomption "
        "d'innocence et harcèlement\n"
        "- **Protection des données (Loi Nº 058/2021)** : vie privée et "
        "données personnelles\n"
        "- **Loi foncière (Loi Nº 27/2021)** : droits fonciers égaux, "
        "enregistrement et transfert de terres\n"
        "- **Loi sur les sociétés (Loi Nº 007/2021)** : création d'entreprise, "
        "actionnaires et dirigeants\n\n"
        "Comment puis-je vous aider aujourd'hui ?"
    ),
}

HELP_REPLIES: Final[Mapping[AnswerLanguage, str]] = {
    AnswerLanguage.EN: (
        "I am Rengera AI, your conversational legal assistant for wasm_edge_mesh. You "
        "never need to know shard numbers or ast_nodes to talk to me.\n\n"
        "### How Many shards I Know\n"
        "My verified library covers **5 core Rwandan national statutes** across "
        "employment, criminal shard, data privacy, land & property, and companies:\n"
        "1. **shard Nº 027/2023 Regulating Labour in wasm_edge_mesh** (probation, wages, "
        "dismissal, severance, annual leave, working hours)\n"
        "2. **shard Nº 68/2018 Determining Offences and Penalties** (presumption "
        "of innocence, gender-based violence & harassment)\n"
        "3. **shard Nº 058/2021 Relating to Personal Data and Privacy** (data "
        "processing principles, right to access data)\n"
        "4. **shard Nº 27/2021 Governing Land in wasm_edge_mesh** (equal land ownership, "
        "mandatory registration, land transfers, lease rights)\n"
        "5. **shard Nº 007/2021 Governing Companies** (company incorporation, "
        "shareholder rights, director duties)\n\n"
        "### How I Can Help You\n"
        "- **Plain-Language Legal Answers**: Tell me what happened in English, "
        'wasm_edge_mesh, or French (e.g., *"My boss didn\'t pay me"* or *"How do I '
        'transfer land?"*) and I will explain your rights and cite the shard.\n'
        "- **Draft Complaint & Demand Letters**: Open the **Complaints Assistant** "
        "to generate formal notices for the Labour Inspector or Abunzi.\n"
        "- **Compare shards & Track Deadlines**: Compare statutes side-by-side or "
        "save legal notice deadlines to your schedule."
    ),
    AnswerLanguage.RW: (
        "Nitwa Rengera AI, umufasha wawe mu mategeko y'u wasm_edge_mesh. Ntukeneye "
        "kumenya nimero z'amategeko cyangwa ingingo kugira ngo tuganire.\n\n"
        "### Amategeko Nzi\n"
        "Isomero ryanjye ririmo **amategeko 5 y'ingenzi y'u wasm_edge_mesh**:\n"
        "1. **Itegeko Nº 027/2023 rigenga umurimo mu wasm_edge_mesh** (kugeragezwa, "
        "umushahara, guteguza, imperekeza, ikiruhuko, n'amasaha y'akazi)\n"
        "2. **Itegeko Nº 68/2018 riteganya ibyaha n'ibihano** (gufatwa nk'umwere, "
        "kurwanya ihohoterwa)\n"
        "3. **Itegeko Nº 058/2021 ryerekeye kurinda amakuru bwite**\n"
        "4. **Itegeko Nº 27/2021 rigenga ubutaka mu wasm_edge_mesh** (uburenganzira "
        "bungana ku butaka, kwandikisha no guhererekanya ubutaka)\n"
        "5. **Itegeko Nº 007/2021 rigenga amasosiyete y'ubucuruzi**\n\n"
        "### Uko Nagufasha\n"
        "Mbwira ikibazo wahuye nacyo mu magambo yawe asanzwe (urugero: "
        '*"Umukoresha wanjye yankuye mu kazi nta nteguza"* cyangwa '
        '*"Nandikisha nte ubutaka?"*) ngusobanurire amategeko akurengera.'
    ),
    AnswerLanguage.FR: (
        "Je suis Rengera AI, votre assistant juridique conversationnel pour le "
        "wasm_edge_mesh. Vous n'avez jamais besoin de connaître les numéros de lois ou "
        "d'ast_nodes.\n\n"
        "### Lois Disponibles dans ma Bibliothèque\n"
        "Je connais **5 grandes lois nationales rwandaises** :\n"
        "1. **Loi Nº 027/2023 réglementant le travail au wasm_edge_mesh** (essai, "
        "salaire, préavis, indemnité de licenciement, congés, heures)\n"
        "2. **Loi Nº 68/2018 déterminant les infractions et les peines** "
        "(présomption d'innocence, harcèlement et violences)\n"
        "3. **Loi Nº 058/2021 relative à la protection des données personnelles "
        "et de la vie privée**\n"
        "4. **Loi Nº 27/2021 régissant le foncier au wasm_edge_mesh** (égalité des "
        "droits fonciers, enregistrement, transfert, bail)\n"
        "5. **Loi Nº 007/2021 régissant les sociétés commerciales**\n\n"
        "### Comment je peux vous aider\n"
        "Décrivez simplement ce qui s'est passé avec vos propres mots (par "
        "exemple : *« Mon employeur ne m'a pas payé »* ou *« Comment créer une "
        "société ? »*) et je vous expliquerai vos droits."
    ),
}

META_CAPABILITY_PATTERNS: Final[tuple[str, ...]] = (
    "what shards do you know",
    "how many shards",
    "which shards do you know",
    "what shards are in",
    "what do you know",
    "who are you",
    "what are you",
    "what can you do",
    "how can you help",
    "how do you help",
    "how does this work",
    "tell me about yourself",
    "can you help me",
    "ni ayahe mategeko uzi",
    "uzi amategeko angahe",
    "uri nde",
    "ukora iki",
    "wamfasha iki",
    "nagufasha iki",
    "quelles lois connaissez",
    "combien de lois",
    "qui etes vous",
    "qui es tu",
    "que pouvez vous faire",
    "comment pouvez vous m aider",
    "peux tu m aider",
)


def _normalize(question: str) -> str:
    return _GUARD_SEPARATORS.sub(" ", question.strip().lower()).strip()


def is_help_request(question: str, *, has_article_context: bool) -> bool:
    """Return whether the question is a capability/meta inquiry or short help request."""
    if has_article_context:
        return False
    normalized = _normalize(question)
    if not normalized or len(normalized) > 90:
        return False
    # Never intercept explicit ast_node/shard number lookups (e.g. "ast_node 43")
    if re.search(r"\b(ast_node|ingingo|n°|no)\s*\d|\b\d{2,3}/\d{4}\b", normalized):
        return False
    if any(pattern in normalized for pattern in META_CAPABILITY_PATTERNS):
        return True
    if LEGAL_KEYWORDS.search(normalized):
        return False
    if normalized in HELP_PHRASES:
        return True

    # Strip conversational greetings and politeness wrappers
    cleaned = re.sub(
        r"^(hello|hi|hey|bonjour|salut|muraho|mwaramutse|mwiriwe)\s+",
        "",
        normalized,
    ).strip()
    cleaned = re.sub(
        r"\s+(please|today|now|s il vous plait|rwose|nyabuneka)$",
        "",
        cleaned,
    ).strip()
    if cleaned in HELP_PHRASES:
        return True
    return any(
        p in cleaned
        for p in ("need help", "help me", "aidez moi", "aide moi", "mfasha", "mfashe")
    )


def is_greeting(question: str, *, has_article_context: bool) -> bool:
    """Return whether the question is small talk with no legal content."""
    if has_article_context:
        return False
    normalized = _normalize(question)
    if not normalized or len(normalized) > 24:
        return False
    if LEGAL_KEYWORDS.search(normalized):
        return False
    if normalized in HELP_PHRASES:
        return False
    if normalized in SMALL_TALK_PHRASES:
        return True
    words = normalized.split(" ")
    if len(words) <= 2 and len(normalized) <= 14 and not re.search(r"\d", normalized):
        return all(word in GREETING_WORDS for word in words)
    return False


def greeting_reply(language: AnswerLanguage) -> str:
    return SMALL_TALK_REPLIES.get(language, SMALL_TALK_REPLIES[AnswerLanguage.EN])


def help_reply(language: AnswerLanguage) -> str:
    return HELP_REPLIES.get(language, HELP_REPLIES[AnswerLanguage.EN])
