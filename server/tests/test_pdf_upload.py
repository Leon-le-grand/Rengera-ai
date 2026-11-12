"""Focused tests for private PDF upload validation and access boundaries."""

from __future__ import annotations

import hashlib
from uuid import UUID, uuid4

from botocore.exceptions import ClientError
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.routes.admin.pdfs import router
from app.auth.dependencies import get_current_principal
from app.auth.principal import Principal
from app.authorization.audit import AuditEntry
from app.authorization.dependencies import get_audit_repository
from app.authorization.permissions import Role, permissions_for_role
from app.repositories.pdf_objects import PdfObjectRecord
from app.storage.settings import PdfStorageSettings

PDF = b"%PDF-1.7\nsource fixture"
PDF_SHA = hashlib.sha256(PDF).hexdigest()


class AuditSink:
    async def record(self, entry: AuditEntry) -> None:
        pass


class FakePdfRepository:
    def __init__(self) -> None:
        self.record = PdfObjectRecord(
            object_id=uuid4(),
            object_key="source-pdfs/final.pdf",
            upload_key="staging/source-pdfs/upload.pdf",
            filename="law.pdf",
            size_bytes=len(PDF),
            sha256=PDF_SHA,
            status="pending",
        )
        self.created = False
        self.finalized = False
        self.owner = UUID(int=1)

    async def create_pending(self, **kwargs) -> PdfObjectRecord:
        self.created = True
        self.owner = kwargs["account_id"]
        return self.record

    async def get_for_finalize(self, object_id, *, account_id, is_admin):
        if object_id != self.record.object_id or (account_id != self.owner and not is_admin):
            return None
        return self.record

    async def can_link_job(self, job_id, *, account_id, is_admin):
        return job_id is None or is_admin

    async def finalize(self, object_id, **kwargs):
        if kwargs["actual_sha256"] != self.record.sha256:
            return None
        self.finalized = True
        return PdfObjectRecord(
            **{**self.record.__dict__, "status": "verified"}
        )

    async def get_authorized(self, object_id, *, account_id, is_admin):
        if object_id != self.record.object_id or not self.finalized:
            return None
        if account_id != self.owner and not is_admin:
            return None
        return PdfObjectRecord(**{**self.record.__dict__, "status": "verified"})


class FakeStorage:
    def __init__(self, *, digest: str = PDF_SHA, pdf: bool = True) -> None:
        self.digest = digest
        self.pdf = pdf
        self.upload_key = None
        self.promoted = None
        self.deleted = None

    def create_upload_url(self, key: str, *, sha256: str, size: int) -> str:
        self.upload_key = key
        return "https://storage.example.test/signed-put"

    def inspect_and_hash(self, key: str, *, max_bytes: int):
        assert key == self.upload_key
        return (
            {"ContentLength": len(PDF), "ContentType": "application/pdf", "ETag": '"etag"'},
            self.digest,
            self.pdf,
        )

    def promote(self, upload_key: str, object_key: str, *, sha256: str, source_etag: str):
        self.promoted = (upload_key, object_key, source_etag)

    def delete(self, key: str) -> None:
        self.deleted = key

    def create_download_url(self, key: str, *, filename: str) -> str:
        return "https://storage.example.test/signed-get"


def make_client(role: Role = Role.STAFF, *, digest: str = PDF_SHA, is_pdf: bool = True):
    account_id = UUID(int=1) if role == Role.STAFF else UUID(int=2)
    principal = Principal(
        account_id=account_id,
        email=f"{role.value}@example.test",
        role=role,
        status="active",
        permissions=permissions_for_role(role),
        session_id=uuid4(),
    )
    repository = FakePdfRepository()
    storage = FakeStorage(digest=digest, pdf=is_pdf)
    app = FastAPI()
    app.include_router(router, prefix="/v1")
    app.state.pdf_object_repository = repository
    app.state.pdf_object_storage = storage
    app.state.pdf_storage_settings = PdfStorageSettings(
        endpoint_url="https://storage.example.test",
        bucket="private-pdfs",
        access_key_id="test-key",
        secret_access_key="test-secret",
        _env_file=None,
    )
    app.dependency_overrides[get_current_principal] = lambda: principal
    app.dependency_overrides[get_audit_repository] = AuditSink
    return TestClient(app), repository, storage, principal


def test_upload_request_and_verified_download_are_scoped_to_owner() -> None:
    client, repository, storage, principal = make_client()
    response = client.post(
        "/v1/admin/pdfs/upload-requests",
        json={
            "filename": "law.pdf",
            "size_bytes": len(PDF),
            "sha256": PDF_SHA,
            "content_type": "application/pdf",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["upload_url"].startswith("https://storage.example.test/")
    assert storage.upload_key == repository.record.upload_key
    assert storage.upload_key != repository.record.object_key

    finalized = client.post(f"/v1/admin/pdfs/{body['object_id']}/finalize", json={})
    assert finalized.status_code == 200
    assert finalized.json()["status"] == "verified"
    assert storage.promoted == (
        repository.record.upload_key,
        repository.record.object_key,
        '"etag"',
    )
    assert storage.deleted == repository.record.upload_key

    download = client.get(f"/v1/admin/pdfs/{body['object_id']}/download")
    assert download.status_code == 200
    assert download.json()["download_url"].endswith("signed-get")
    assert principal.account_id == repository.owner


def test_upload_rejects_invalid_pdf_bytes_and_hash() -> None:
    client, repository, storage, _ = make_client(digest="0" * 64)
    issued = client.post(
        "/v1/admin/pdfs/upload-requests",
        json={
            "filename": "law.pdf",
            "size_bytes": len(PDF),
            "sha256": PDF_SHA,
        },
    )
    result = client.post(f"/v1/admin/pdfs/{issued.json()['object_id']}/finalize", json={})
    assert result.status_code == 409
    assert not repository.finalized
    assert storage.promoted is None

    bad_pdf_client, _repo, _storage, _ = make_client(is_pdf=False)
    issued = bad_pdf_client.post(
        "/v1/admin/pdfs/upload-requests",
        json={"filename": "law.pdf", "size_bytes": len(PDF), "sha256": PDF_SHA},
    )
    result = bad_pdf_client.post(f"/v1/admin/pdfs/{issued.json()['object_id']}/finalize", json={})
    assert result.status_code == 409


def test_invalid_filename_type_and_user_permission_are_rejected() -> None:
    client, repository, _storage, _ = make_client()
    invalid = client.post(
        "/v1/admin/pdfs/upload-requests",
        json={
            "filename": "../law.pdf",
            "size_bytes": len(PDF),
            "sha256": PDF_SHA,
            "content_type": "application/pdf",
        },
    )
    assert invalid.status_code == 422
    assert not repository.created

    user_client, user_repository, _storage, _ = make_client(Role.USER)
    denied = user_client.post(
        "/v1/admin/pdfs/upload-requests",
        json={"filename": "law.pdf", "size_bytes": len(PDF), "sha256": PDF_SHA},
    )
    assert denied.status_code == 403
    assert not user_repository.created


def test_pdf_storage_settings_bound_presign_ttl_and_credentials() -> None:
    try:
        PdfStorageSettings(
            endpoint_url="https://storage.example.test",
            bucket="private",
            access_key_id="only-one",
            _env_file=None,
        )
    except ValueError as exc:
        assert "configured together" in str(exc)
    else:
        raise AssertionError("unpaired storage credentials should be rejected")

    try:
        PdfStorageSettings(upload_url_ttl_seconds=901, _env_file=None)
    except ValueError as exc:
        assert "between 30 and 900" in str(exc)
    else:
        raise AssertionError("excessive signed URL lifetime should be rejected")

def test_finalize_recovers_verified_copy_after_staging_expires(monkeypatch):
    client, repository, storage, _ = make_client()

    def inspect(key, *, max_bytes):
        if key == repository.record.upload_key:
            raise ClientError({"ResponseMetadata": {"HTTPStatusCode": 404}}, "HeadObject")
        assert key == repository.record.object_key
        return (
            {"ContentLength": len(PDF), "ContentType": "application/pdf", "ETag": '"etag"'},
            PDF_SHA,
            True,
        )

    monkeypatch.setattr(storage, "inspect_and_hash", inspect)
    result = client.post(f"/v1/admin/pdfs/{repository.record.object_id}/finalize", json={})
    assert result.status_code == 200
    assert repository.finalized
    assert storage.promoted is None
