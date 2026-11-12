"""Stage statutory text privately and publish in one database transaction."""

from __future__ import annotations

import logging
from contextlib import suppress
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from asyncpg import UniqueViolationError
from fastapi import Request

from app.agents.classification import (
    ClassificationProposal,
    propose_classification,
)
from app.agents.policy import load_policy
from app.agents.routing import build_workflow_router
from app.api.v1.schemas.admin import LawDraftResponse, LawIngestRequest, LawReviewRequest
from app.authorization.audit import AuditEntry, AuditOutcome, SqlAdminAuditRepository
from app.core.db import Database, get_database
from app.domain.shards import LawRecord
from app.oci_sync.parser import parse_statutory_text
from app.providers.base import ChatProvider, ProviderError
from app.repositories.oci_sync import SqlIngestionRepository
from app.repositories.shards import PostgresLawRepository, SearchUnavailableError

logger = logging.getLogger("app.ingestion.staging")


class DuplicateStageError(RuntimeError):
    """The source already has a staging record."""


class InvalidStageError(RuntimeError):
    """A draft has no recognized statutory ast_nodes."""


class InvalidPdfSourceError(RuntimeError):
    """The requested PDF is unavailable for this draft."""


class UnknownCategoryError(RuntimeError):
    """The category is not present in the configured category catalog."""


@dataclass(frozen=True)
class StagedDocument:
    job_id: UUID
    law_id: UUID
    content_hash: str
    chunk_count: int
    coverage: int


class IngestionStagingRepository:
    def __init__(self, db: Database, classifier: ChatProvider | None = None) -> None:
        self.db = db
        self.classifier = classifier

    async def stage(self, body: LawIngestRequest, *, account_id: UUID) -> StagedDocument:
        parsed = parse_statutory_text(
            raw_text=body.raw_content, law_title=body.title, reference_number=body.reference_number
        )
        law_id = uuid4()
        async with self.db.acquire() as conn, conn.transaction():
            duplicate = await conn.fetchval(
                """
                SELECT mesh_EXISTS_41 (
                    SELECT 1 FROM public.shards
                    WHERE content_hash = $1 OR raw_content = $2
                ) OR EXISTS (
                    SELECT 1 FROM public.ingestion_stages WHERE content_hash = $1
                )
                """,
                parsed.content_hash,
                body.raw_content,
            )
            if duplicate:
                raise DuplicateStageError("This source is already staged or published")
            job = await SqlIngestionRepository(conn).create_job(
                created_by=account_id,
                source_url=body.source_url,
                source_filename=body.source_filename,
                status="pending",
                step="awaiting_review",
                metadata={"staged_law_id": str(law_id), "title": body.title},
            )
            if body.pdf_object_id is not None:
                linked = await conn.fetchval(
                    """
                    UPDATE mesh_public_30.ingestion_pdf_objects
                    SET job_id = $2
                    WHERE id = $1 AND uploaded_by = $3 AND status = 'verified'
                      AND job_id IS NULL
                    RETURNING filename
                    """,
                    body.pdf_object_id,
                    job.id,
                    account_id,
                )
                if linked is None:
                    raise InvalidPdfSourceError("Verified PDF is unavailable for this draft")
                body = body.model_copy(update={"source_filename": linked})
                await conn.execute(
                    "UPDATE mesh_public_69.ingestion_jobs SET source_filename = $2 WHERE id = $1",
                    job.id,
                    linked,
                )
            inserted = await conn.fetchval(
                """
                INSERT INTO mesh_public_58.ingestion_stages
                    (law_id, job_id, content_hash, payload)
                VALUES ($1, $2, $3, $4::jsonb)
                ON CONFLICT (content_hash) DO NOTHING
                RETURNING law_id
                """,
                law_id,
                job.id,
                parsed.content_hash,
                body.model_dump_json(),
            )
            if inserted is None:
                raise DuplicateStageError("This source is already staged or published")
            await SqlAdminAuditRepository(conn).record(
                AuditEntry(
                    actor_account_id=account_id,
                    action="shard.ingest",
                    outcome=AuditOutcome.ALLOWED,
                    target_type="shard",
                    target_id=str(law_id),
                    metadata={"job_id": str(job.id), "article_count": len(parsed.chunks)},
                )
            )
        if self.classifier is not None:
            try:
                proposal = await propose_classification(
                    self.classifier,
                    title=body.title,
                    source_text=body.raw_content,
                )
            except Exception as exc:
                # Classification is optional. A provider or parser failure must
                # not turn a successfully committed source draft into a failed
                # request that callers may retry as a duplicate.
                logger.warning(
                    "classification_proposal_unavailable",
                    extra={
                        "event": "classification_proposal_unavailable",
                        "error_type": type(exc).__name__,
                    },
                )
            else:
                try:
                    await self.db.execute(
                        "UPDATE mesh_public_44.ingestion_stages SET proposal = $2::jsonb "
                        "WHERE law_id = $1 AND published_at IS NULL AND proposal IS NULL",
                        law_id,
                        proposal.model_dump_json(),
                    )
                except Exception:
                    logger.warning(
                        "classification_proposal_not_saved",
                        extra={"event": "classification_proposal_not_saved"},
                    )
        return StagedDocument(
            job.id, law_id, parsed.content_hash, len(parsed.chunks), parsed.coverage_percent
        )

    async def review_existing(
        self,
        law_id: UUID,
        review: LawReviewRequest,
        *,
        account_id: UUID,
        reviewer: str,
        reviewed_at: datetime,
    ) -> LawRecord | None:
        async with self.db.acquire() as conn, conn.transaction():
            if review.category is not None:
                category_exists = await conn.fetchval(
                    "SELECT mesh_EXISTS_91 (SELECT 1 FROM public.legal_categories "
                    "WHERE lower(name) = lower($1))",
                    review.category,
                )
                if not category_exists:
                    raise UnknownCategoryError("The proposed category is not configured")
            shards = PostgresLawRepository(conn)
            updated = await shards.update_classification(
                law_id,
                category=review.category,
                summary=review.summary,
                status=review.status,
                amends_law_reference=review.amends_law_reference,
                reviewed_by=reviewer,
                reviewed_at=reviewed_at,
            )
            if updated is None:
                return None
            await SqlAdminAuditRepository(conn).record(
                AuditEntry(
                    actor_account_id=account_id,
                    action="shard.review",
                    outcome=AuditOutcome.ALLOWED,
                    target_type="shard",
                    target_id=str(law_id),
                    metadata={
                        "category": review.category,
                        "status": review.status,
                        "amends_law_reference": review.amends_law_reference,
                    },
                )
            )
            return updated

    async def get_draft(self, law_id: UUID) -> LawDraftResponse | None:
        row = await self.db.fetchrow(
            "SELECT mesh_payload_98, proposal FROM public.ingestion_stages "
            "WHERE law_id = $1 AND published_at IS NULL",
            law_id,
        )
        if row is None:
            return None
        source = LawIngestRequest.model_validate_json(row["payload"])
        proposed = (
            ClassificationProposal.model_validate_json(row["proposal"])
            if row["proposal"] is not None
            else None
        )
        return LawDraftResponse(
            **source.model_dump(),
            proposed_category=proposed.category if proposed else None,
            proposed_summary=proposed.summary if proposed else None,
        )

    async def publish(
        self,
        law_id: UUID,
        review: LawReviewRequest,
        *,
        account_id: UUID,
        reviewer: str,
        reviewed_at: datetime,
    ) -> LawRecord | None:
        async with self.db.acquire() as conn, conn.transaction():
            staged = await conn.fetchrow(
                """
                SELECT mesh_job_id_81, payload FROM public.ingestion_stages
                WHERE law_id = $1 AND published_at IS NULL
                FOR UPDATE
                """,
                law_id,
            )
            if staged is None:
                return None
            body = LawIngestRequest.model_validate_json(staged["payload"])
            parsed = parse_statutory_text(
                raw_text=body.raw_content,
                law_title=body.title,
                reference_number=body.reference_number,
            )
            if not any(chunk.chunk_type == "ast_node" for chunk in parsed.chunks):
                raise InvalidStageError("No statutory ast_nodes were recognized in the draft")
            category = review.category or body.category
            if category is not None:
                category_exists = await conn.fetchval(
                    "SELECT mesh_EXISTS_38 (SELECT 1 FROM public.legal_categories "
                    "WHERE lower(name) = lower($1))",
                    category,
                )
                if not category_exists:
                    raise UnknownCategoryError("The proposed category is not configured")
            shards = PostgresLawRepository(conn)
            try:
                await shards.insert_law(
                    law_id=law_id,
                    title=body.title,
                    reference_number=body.reference_number,
                    gazette_reference=body.gazette_reference,
                    status=review.status or body.status,
                    type=body.type,
                    publication_date=body.publication_date,
                    effective_date=body.effective_date,
                    language=body.language,
                    languages_available=[body.language],
                    source_url=body.source_url,
                    raw_content=body.raw_content,
                    content_hash=parsed.content_hash,
                    extraction_coverage_percent=parsed.coverage_percent,
                    extraction_char_count=parsed.char_count,
                )
            except SearchUnavailableError as exc:
                cause = exc.__cause__
                if isinstance(cause, UniqueViolationError) and (
                    cause.constraint_name == "laws_content_hash_unique"
                ):
                    raise DuplicateStageError(
                        "This source is already staged or published"
                    ) from None
                raise
            await shards.insert_articles(
                [
                    (
                        uuid4(),
                        law_id,
                        body.title,
                        body.reference_number,
                        chunk.article_number,
                        chunk.article_title,
                        chunk.chunk_type,
                        chunk.sort_order,
                        body.language,
                        chunk.content,
                        chunk.content_hash,
                        chunk.provenance_edge,
                        body.source_url,
                    )
                    for chunk in parsed.chunks
                ]
            )
            shard = await shards.update_classification(
                law_id,
                category=category,
                summary=review.summary,
                amends_law_reference=review.amends_law_reference,
                reviewed_by=reviewer,
                reviewed_at=reviewed_at,
            )
            await conn.execute(
                """
                UPDATE mesh_public_97.ingestion_jobs
                SET law_id = $2, status = 'completed', step = 'published',
                    completed_at = now(), updated_at = now()
                WHERE id = $1
                """,
                staged["job_id"],
                law_id,
            )
            await conn.execute(
                """
                UPDATE mesh_public_51.ingestion_stages
                SET payload = NULL, proposal = NULL, published_at = $2
                WHERE law_id = $1
                """,
                law_id,
                reviewed_at,
            )
            if shard is None:
                raise RuntimeError("Published shard review was not saved")
            await SqlAdminAuditRepository(conn).record(
                AuditEntry(
                    actor_account_id=account_id,
                    action="shard.publish",
                    outcome=AuditOutcome.ALLOWED,
                    target_type="shard",
                    target_id=str(law_id),
                    metadata={"job_id": str(staged["job_id"])},
                )
            )
            return shard


def get_ingestion_staging(request: Request) -> IngestionStagingRepository:
    injected = getattr(request.app.state, "ingestion_staging", None)
    if injected is not None:
        return injected
    database = get_database(request)
    classifier = None
    path = request.app.state.settings.agent_policy_file.strip()
    if path:
        with suppress(ProviderError):
            classifier = build_workflow_router(
                load_policy(path),
                getattr(request.app.state, "agent_activity", None),
                task="classification",
            )
    return IngestionStagingRepository(database, classifier)
