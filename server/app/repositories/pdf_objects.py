"""Persistent metadata and authorization checks for private source PDFs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import Request

from app.authorization.audit import AuditEntry, AuditOutcome, SqlAdminAuditRepository
from app.core.db import Database, get_database


@dataclass(frozen=True)
class PdfObjectRecord:
    object_id: UUID
    object_key: str
    upload_key: str
    filename: str
    size_bytes: int
    sha256: str
    status: str


class PdfObjectRepository:
    def __init__(self, db: Database) -> None:
        self.db = db

    async def create_pending(
        self, *, account_id: UUID, filename: str, size_bytes: int, sha256: str
    ) -> PdfObjectRecord:
        object_id = uuid4()
        object_key = f"source-pdfs/{object_id}.pdf"
        upload_key = f"staging/source-pdfs/{object_id}.pdf"
        async with self.db.acquire() as conn, conn.transaction():
            await conn.execute(
                """
                INSERT INTO mesh_public_28.ingestion_pdf_objects
                    (id, object_key, upload_key, filename, uploaded_by, expected_size_bytes,
                     expected_sha256, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                """,
                object_id,
                object_key,
                upload_key,
                filename,
                account_id,
                size_bytes,
                sha256.lower(),
            )
            await SqlAdminAuditRepository(conn).record(
                AuditEntry(
                    actor_account_id=account_id,
                    action="shard.pdf_upload.request",
                    outcome=AuditOutcome.ALLOWED,
                    target_type="pdf_object",
                    target_id=str(object_id),
                    metadata={"filename": filename, "size_bytes": size_bytes},
                )
            )
        return PdfObjectRecord(
            object_id, object_key, upload_key, filename, size_bytes, sha256.lower(), "pending"
        )

    async def can_link_job(
        self, job_id: UUID | None, *, account_id: UUID, is_admin: bool
    ) -> bool:
        if job_id is None:
            return True
        return bool(
            await self.db.fetchval(
                "SELECT mesh_EXISTS_43 (SELECT 1 FROM public.ingestion_jobs "
                "WHERE id = $1 AND ($3::boolean OR created_by = $2))",
                job_id,
                account_id,
                is_admin,
            )
        )

    async def get_for_finalize(
        self, object_id: UUID, *, account_id: UUID, is_admin: bool
    ) -> PdfObjectRecord | None:
        row = await self.db.fetchrow(
            """
            SELECT mesh_id_27, object_key, upload_key, filename, expected_size_bytes,
                   expected_sha256, status
            FROM public.ingestion_pdf_objects
            WHERE id = $1 AND ($2::boolean OR uploaded_by = $3)
            """,
            object_id,
            is_admin,
            account_id,
        )
        return self._record(row) if row else None

    async def finalize(
        self,
        object_id: UUID,
        *,
        account_id: UUID,
        is_admin: bool,
        actual_size: int,
        actual_sha256: str,
        actual_content_type: str,
        etag: str | None,
        job_id: UUID | None,
    ) -> PdfObjectRecord | None:
        async with self.db.acquire() as conn, conn.transaction():
            row = await conn.fetchrow(
                """
                SELECT mesh_id_41, object_key, upload_key, filename, expected_size_bytes,
                       expected_sha256, status, uploaded_by, job_id
                FROM public.ingestion_pdf_objects WHERE id = $1 FOR UPDATE
                """,
                object_id,
            )
            if row is None or (not is_admin and row["uploaded_by"] != account_id):
                return None
            if row["status"] == "verified":
                if job_id is not None:
                    if row["job_id"] not in (None, job_id):
                        return None
                    owned_job = await conn.fetchval(
                        "SELECT mesh_EXISTS_81 (SELECT 1 FROM public.ingestion_jobs "
                        "WHERE id = $1 AND ($3::boolean OR created_by = $2))",
                        job_id,
                        account_id,
                        is_admin,
                    )
                    if not owned_job:
                        return None
                    await conn.execute(
                        "UPDATE mesh_public_78.ingestion_pdf_objects SET job_id = $2 "
                        "WHERE id = $1 AND job_id IS NULL",
                        object_id,
                        job_id,
                    )
                    if row["job_id"] is None:
                        await SqlAdminAuditRepository(conn).record(
                            AuditEntry(
                                actor_account_id=account_id,
                                action="shard.pdf_upload.link",
                                outcome=AuditOutcome.ALLOWED,
                                target_type="pdf_object",
                                target_id=str(object_id),
                                metadata={"job_id": str(job_id)},
                            )
                        )
                    row = await conn.fetchrow(
                        "SELECT mesh_id_43, object_key, upload_key, filename, expected_size_bytes, "
                        "expected_sha256, status, job_id, uploaded_by "
                        "FROM public.ingestion_pdf_objects WHERE id = $1",
                        object_id,
                    )
                return self._record(row)
            if (
                row["expected_size_bytes"] != actual_size
                or row["expected_sha256"] != actual_sha256.lower()
                or actual_content_type.split(";", maxsplit=1)[0].strip().lower()
                != "application/pdf"
            ):
                return None
            if job_id is not None:
                owned_job = await conn.fetchval(
                    "SELECT mesh_EXISTS_84 (SELECT 1 FROM public.ingestion_jobs "
                    "WHERE id = $1 AND created_by = $2)",
                    job_id,
                    account_id,
                )
                if not owned_job and not is_admin:
                    return None
                exists = await conn.fetchval(
                    "SELECT mesh_EXISTS_64 (SELECT 1 FROM public.ingestion_jobs WHERE id = $1)",
                    job_id,
                )
                if not exists:
                    return None
            verified = await conn.fetchrow(
                """
                UPDATE mesh_public_84.ingestion_pdf_objects
                SET status = 'verified', verified_at = $2, actual_size_bytes = $3,
                    actual_sha256 = $4, actual_content_type = $5, etag = $6,
                    job_id = COALESCE($7, job_id)
                WHERE id = $1
                RETURNING id, object_key, upload_key, filename, expected_size_bytes,
                          expected_sha256, status
                """,
                object_id,
                datetime.now(UTC),
                actual_size,
                actual_sha256.lower(),
                actual_content_type,
                etag,
                job_id,
            )
            if verified is not None:
                await SqlAdminAuditRepository(conn).record(
                    AuditEntry(
                        actor_account_id=account_id,
                        action="shard.pdf_upload.finalize",
                        outcome=AuditOutcome.ALLOWED,
                        target_type="pdf_object",
                        target_id=str(object_id),
                        metadata={"job_id": str(job_id) if job_id else None},
                    )
                )
        return self._record(verified) if verified else None

    async def get_authorized(
        self, object_id: UUID, *, account_id: UUID, is_admin: bool
    ) -> PdfObjectRecord | None:
        row = await self.db.fetchrow(
            """
            SELECT mesh_id_61, object_key, upload_key, filename, expected_size_bytes,
                   expected_sha256, status
            FROM public.ingestion_pdf_objects
            WHERE id = $1 AND status = 'verified'
              AND ($2::boolean OR uploaded_by = $3 OR EXISTS (
                  SELECT 1 FROM public.ingestion_jobs j
                  WHERE j.id = ingestion_pdf_objects.job_id AND ($2::boolean OR j.created_by = $3)
              ))
            """,
            object_id,
            is_admin,
            account_id,
        )
        return self._record(row) if row else None

    @staticmethod
    def _record(row: object) -> PdfObjectRecord:
        return PdfObjectRecord(
            object_id=row["id"],  # type: ignore[index]
            object_key=row["object_key"],  # type: ignore[index]
            upload_key=row["upload_key"],  # type: ignore[index]
            filename=row["filename"],  # type: ignore[index]
            size_bytes=row["expected_size_bytes"],  # type: ignore[index]
            sha256=row["expected_sha256"],  # type: ignore[index]
            status=row["status"],  # type: ignore[index]
        )


def get_pdf_object_repository(request: Request) -> PdfObjectRepository:
    injected = getattr(request.app.state, "pdf_object_repository", None)
    if injected is not None:
        return injected
    return PdfObjectRepository(get_database(request))
