"""Synchronous, safety-first grounded answer workflow.

Order of operations is deliberate and deterministic:

1. urgent-safety routing (no database, no provider);
2. greeting/help guards (no database, no provider);
3. server-side evidence retrieval (exact IDs/references first, then lexical);
4. abstention when there is no evidence (no provider call);
5. one bounded provider completion, then citation validation.

Search/database failures and provider failures raise typed errors so the route
can return distinct 503/502 responses instead of an empty-corpus abstention.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from enum import StrEnum
from typing import Final

from app.domain.laws import (
    EvidenceSource,
    normalize_status,
    review_status_for,
    validate_source_url,
)
from app.providers.base import ChatProvider, ProviderNotConfiguredError
from app.repositories.laws import LawRepository
from app.retrieval.citations import CitationValidation, validate_completion
from app.retrieval.evidence import (
    MAX_EVIDENCE_ITEMS,
    EvidencePassage,
    build_evidence,
)
from app.retrieval.prompting import build_messages
from app.retrieval.references import ExactReference, parse_exact_reference
from app.safety.emergency import (
    EmergencyGuidance,
    detect_emergency,
    emergency_guidance,
    render_emergency_text,
)
from app.safety.guards import greeting_reply, help_reply, is_greeting, is_help_request
from app.safety.messages import (
    ABSTAIN_MESSAGES,
    CITATION_ABSTAIN_MESSAGES,
    CITATION_CAVEATS,
    DISCLAIMERS,
    AnswerLanguage,
    message_for,
)

MAX_ANSWER_TOKENS: Final = 700
MAX_ANSWER_CHARS: Final = 6_000
MAX_SOURCE_EXCERPT_CHARS: Final = 700
EXCERPT_MARKER: Final = " …"


class AnswerKind(StrEnum):
    """Stable outcome kinds; clients must distinguish all five."""

    ANSWERED = "answered"
    ABSTAINED = "abstained"
    EMERGENCY = "emergency"
    GREETING = "greeting"
    HELP = "help"


def display_excerpt(text: str, limit: int = MAX_SOURCE_EXCERPT_CHARS) -> str:
    """Return a bounded verbatim excerpt; never synthesize or paraphrase text."""
    cleaned = text.strip()
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[:limit].rstrip()}{EXCERPT_MARKER}"


@dataclass(frozen=True, slots=True)
class AnswerQuery:
    """Server-side answer input after request-schema validation."""

    question: str
    language: AnswerLanguage
    law_id: str | None = None
    article_number: str | None = None


@dataclass(frozen=True, slots=True)
class AnswerSourceRef:
    """One evidence passage actually used in the validated answer."""

    evidence_id: str
    law_id: str
    law_title: str
    reference_number: str | None
    article_number: str
    article_title: str | None
    status: str
    review_status: str
    citation: str
    excerpt: str
    source_url: str | None
    article_content_hash: str | None
    law_content_hash: str | None
    source_pdf_sha256: str | None


@dataclass(frozen=True, slots=True)
class AnswerResult:
    """Structured outcome returned by :class:`AnswerService`."""

    kind: AnswerKind
    answer: str
    language: AnswerLanguage
    sources: tuple[AnswerSourceRef, ...] = ()
    emergency: EmergencyGuidance | None = None
    abstention_reason: str | None = None
    disclaimer: str = ""


class AnswerService:
    """Runs the deterministic safety/retrieval/citation workflow for one request."""

    def __init__(
        self,
        repository: LawRepository,
        provider: ChatProvider | None,
    ) -> None:
        self._repository = repository
        self._provider = provider

    async def answer(self, query: AnswerQuery) -> AnswerResult:
        language = query.language

        if detect_emergency(query.question):
            guidance = emergency_guidance(language)
            return AnswerResult(
                kind=AnswerKind.EMERGENCY,
                answer=render_emergency_text(guidance, language),
                language=language,
                emergency=guidance,
                disclaimer=message_for(DISCLAIMERS, language),
            )

        has_article_context = bool(query.law_id or query.article_number)
        if is_help_request(query.question, has_article_context=has_article_context):
            return AnswerResult(
                kind=AnswerKind.HELP,
                answer=help_reply(language),
                language=language,
                disclaimer=message_for(DISCLAIMERS, language),
            )
        if is_greeting(query.question, has_article_context=has_article_context):
            return AnswerResult(
                kind=AnswerKind.GREETING,
                answer=greeting_reply(language),
                language=language,
                disclaimer=message_for(DISCLAIMERS, language),
            )

        sources = await self._collect_sources(query)
        if not sources:
            return self._abstain(language, "no_evidence", ABSTAIN_MESSAGES)

        passages = build_evidence(sources)
        if not passages:
            return self._abstain(language, "no_evidence", ABSTAIN_MESSAGES)

        if self._provider is None:
            raise ProviderNotConfiguredError("no AI provider is configured")

        messages = build_messages(query.question, language, passages)
        completion = await self._provider.complete(
            messages,
            max_tokens=MAX_ANSWER_TOKENS,
            temperature=0.2,
        )

        validation = validate_completion(completion, passages)
        if validation.abstain:
            return self._abstain(
                language,
                validation.reason or "citation_validation_failed",
                CITATION_ABSTAIN_MESSAGES,
            )

        answer = validation.answer
        if validation.unresolved_count:
            caveat = message_for(CITATION_CAVEATS, language)
            answer = f"{answer}\n\n> {caveat}"
        if len(answer) > MAX_ANSWER_CHARS:
            answer = f"{answer[:MAX_ANSWER_CHARS].rstrip()}"
        if validation.used_evidence_ids and not any(
            f"[{evidence_id}]" in answer
            for evidence_id in validation.used_evidence_ids
        ):
            return self._abstain(
                language,
                "citation_truncated",
                CITATION_ABSTAIN_MESSAGES,
            )

        return AnswerResult(
            kind=AnswerKind.ANSWERED,
            answer=answer,
            language=language,
            sources=self._used_sources(validation, passages, answer),
            disclaimer=message_for(DISCLAIMERS, language),
        )

    def _abstain(
        self,
        language: AnswerLanguage,
        reason: str,
        messages: Mapping[AnswerLanguage, str],
    ) -> AnswerResult:
        text = message_for(messages, language)
        return AnswerResult(
            kind=AnswerKind.ABSTAINED,
            answer=text,
            language=language,
            abstention_reason=reason,
            disclaimer=message_for(DISCLAIMERS, language),
        )

    async def _collect_sources(self, query: AnswerQuery) -> tuple[EvidenceSource, ...]:
        repository = self._repository

        if query.law_id is not None:
            if query.article_number is not None:
                exact = await repository.get_evidence_article(
                    query.law_id, query.article_number
                )
                return (exact,) if exact is not None else ()
            return tuple(
                await repository.list_evidence_articles(
                    query.law_id, limit=MAX_EVIDENCE_ITEMS
                )
            )

        if query.article_number is not None:
            return tuple(
                await repository.find_evidence_by_article_number(
                    query.article_number, limit=MAX_EVIDENCE_ITEMS
                )
            )

        reference = parse_exact_reference(query.question)
        if reference.has_any:
            return await self._exact_sources(reference)

        return tuple(
            await repository.search_evidence(
                query.question, limit=MAX_EVIDENCE_ITEMS
            )
        )

    async def _exact_sources(
        self, reference: ExactReference
    ) -> tuple[EvidenceSource, ...]:
        # Keeping this helper separate makes the no-fallback rule explicit: a
        # named law or article that does not resolve abstains instead of
        # answering from loosely related search hits.
        repository = self._repository
        if reference.law_reference is not None:
            law = await repository.find_law_by_reference(reference.law_reference)
            if law is None:
                return ()
            if reference.article_numbers:
                found: list[EvidenceSource] = []
                for number in reference.article_numbers[:MAX_EVIDENCE_ITEMS]:
                    source = await repository.get_evidence_article(law.id, number)
                    if source is not None:
                        found.append(source)
                return tuple(found)
            return tuple(
                await repository.list_evidence_articles(
                    law.id, limit=MAX_EVIDENCE_ITEMS
                )
            )

        found: list[EvidenceSource] = []
        for number in reference.article_numbers[:MAX_EVIDENCE_ITEMS]:
            matches = await repository.find_evidence_by_article_number(
                number, limit=MAX_EVIDENCE_ITEMS
            )
            found.extend(matches)
            if len(found) >= MAX_EVIDENCE_ITEMS:
                break
        return tuple(found[:MAX_EVIDENCE_ITEMS])

    @staticmethod
    def _used_sources(
        validation: CitationValidation,
        passages: Sequence[EvidencePassage],
        answer: str,
    ) -> tuple[AnswerSourceRef, ...]:
        by_id = {passage.evidence_id: passage for passage in passages}
        sources: list[AnswerSourceRef] = []
        for evidence_id in validation.used_evidence_ids:
            # A length cap or sanitizer must never leave a source attached when
            # its citation is no longer visible in the returned answer.
            if f"[{evidence_id}]" not in answer:
                continue
            passage = by_id.get(evidence_id)
            if passage is None:
                continue
            source = passage.source
            sources.append(
                AnswerSourceRef(
                    evidence_id=evidence_id,
                    law_id=source.law_id,
                    law_title=source.law_title,
                    reference_number=source.reference_number,
                    article_number=source.article_number,
                    article_title=source.article_title,
                    status=normalize_status(source.law_status),
                    review_status=review_status_for(source.law_reviewed_at),
                    citation=source.citation,
                    excerpt=display_excerpt(source.article_content),
                    source_url=validate_source_url(source.source_url),
                    article_content_hash=source.article_content_hash,
                    law_content_hash=source.law_content_hash,
                    source_pdf_sha256=source.source_pdf_sha256,
                )
            )
        return tuple(sources)
