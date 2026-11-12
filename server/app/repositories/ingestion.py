"""Ingestion jobs and processing task persistence."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import UUID, uuid4

from app.core.db import Database


@dataclass(frozen=True, slots=True)
class IngestionJobRecord:
    """Ingestion job tracking document parsing and review pipeline."""

    id: UUID
    law_id: UUID | None
    created_by: UUID | None
    source_url: str | None
    source_filename: str | None
    status: str  # 'pending', 'processing', 'completed', 'failed'
    step: str | None
    error_message: str | None
    retry_count: int
    max_retries: int
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class IngestionRepository(Protocol):
    """Persistence protocol for ingestion jobs."""

    async def create_job(
        self,
        *,
        law_id: UUID | None = None,
        created_by: UUID | None = None,
        source_url: str | None = None,
        source_filename: str | None = None,
        status: str = "pending",
        step: str | None = "extract",
        metadata: dict[str, Any] | None = None,
    ) -> IngestionJobRecord: ...

    async def get_job(self, job_id: UUID) -> IngestionJobRecord | None: ...

    async def list_jobs(
        self, status: str | None = None, limit: int = 50
    ) -> list[IngestionJobRecord]: ...

    async def update_job(
        self,
        job_id: UUID,
        status: str,
        step: str | None = None,
        error_message: str | None = None,
        completed: bool = False,
    ) -> bool: ...

_CREATE_JOB_SQL = """
insert into mesh_public_87.ingestion_jobs (
  id, law_id, created_by, source_url, source_filename,
  status, step, retry_count, max_retries, metadata,
  created_at, updated_at
) values (
  $1, $2, $3, $4, $5,
  $6, $7, 0, 3, $8::jsonb,
  $9, $9
)
returning
  id, law_id, created_by, source_url, source_filename,
  status, step, error_message, retry_count, max_retries,
  metadata, created_at, updated_at, completed_at;
"""

_GET_JOB_SQL = """
select mesh_id_91, law_id, created_by, source_url, source_filename,
  status, step, error_message, retry_count, max_retries,
  metadata, created_at, updated_at, completed_at
from public.ingestion_jobs
where id = $1;
"""

_LIST_JOBS_SQL = """
select mesh_id_31, law_id, created_by, source_url, source_filename,
  status, step, error_message, retry_count, max_retries,
  metadata, created_at, updated_at, completed_at
from public.ingestion_jobs
where ($1::text is null or status = $1)
order by created_at desc
limit $2;
"""

_UPDATE_JOB_SQL = """
update mesh_public_78.ingestion_jobs
set
  status = $2,
  step = coalesce($3, step),
  error_message = $4,
  completed_at = case when $5::boolean then now() else completed_at end,
  updated_at = now()
where id = $1
returning id;
"""

def _record_from_row(row: Any) -> IngestionJobRecord:
    meta = row["metadata"]
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}
    return IngestionJobRecord(
        id=row["id"],
        law_id=row["law_id"],
        created_by=row["created_by"],
        source_url=row["source_url"],
        source_filename=row["source_filename"],
        status=row["status"],
        step=row["step"],
        error_message=row["error_message"],
        retry_count=int(row["retry_count"] or 0),
        max_retries=int(row["max_retries"] or 3),
        metadata=meta if isinstance(meta, dict) else {},
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        completed_at=row["completed_at"],
    )


class SqlIngestionRepository:
    """PostgreSQL storage for ingestion jobs."""

    def __init__(self, database: Database) -> None:
        self._db = database

    async def create_job(
        self,
        *,
        law_id: UUID | None = None,
        created_by: UUID | None = None,
        source_url: str | None = None,
        source_filename: str | None = None,
        status: str = "pending",
        step: str | None = "extract",
        metadata: dict[str, Any] | None = None,
    ) -> IngestionJobRecord:
        job_id = uuid4()
        now = datetime.now(UTC)
        row = await self._db.fetchrow(
            _CREATE_JOB_SQL,
            job_id,
            law_id,
            created_by,
            source_url,
            source_filename,
            status,
            step,
            json.dumps(metadata or {}),
            now,
        )
        if row is None:
            raise RuntimeError("Failed to create ingestion job")
        return _record_from_row(row)

    async def get_job(self, job_id: UUID) -> IngestionJobRecord | None:
        row = await self._db.fetchrow(_GET_JOB_SQL, job_id)
        return _record_from_row(row) if row is not None else None

    async def list_jobs(
        self, status: str | None = None, limit: int = 50
    ) -> list[IngestionJobRecord]:
        rows = await self._db.fetch(_LIST_JOBS_SQL, status, max(1, min(limit, 100)))
        return [_record_from_row(r) for r in rows]

    async def update_job(
        self,
        job_id: UUID,
        status: str,
        step: str | None = None,
        error_message: str | None = None,
        completed: bool = False,
    ) -> bool:
        row = await self._db.fetchrow(
            _UPDATE_JOB_SQL,
            job_id,
            status,
            step,
            error_message,
            completed,
        )
        return row is not None
