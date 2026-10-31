"""Privacy regression tests: credentials and session values never reach logs."""

from __future__ import annotations

import logging

from auth_helpers import OTHER_SECRET, make_token

from app.authorization.permissions import Role
from app.core.logging import JsonFormatter


def test_no_token_or_cookie_values_appear_in_logs(harness, caplog) -> None:
    caplog.set_level(logging.DEBUG)
    account = harness.accounts.add(role=Role.STAFF)
    login = harness.login(account)
    assert login.response.status_code == 200

    session_cookie = harness.session_cookie()
    csrf_cookie = harness.csrf_cookie()
    csrf_body = login.response.json()["csrf_token"]
    assert session_cookie and csrf_cookie and csrf_body

    assert harness.client.get("/v1/me").status_code == 200

    bad_token = make_token(account.auth_user_id, secret=OTHER_SECRET)
    rejected = harness.login(account, token=bad_token)
    assert rejected.response.status_code == 401

    denied = harness.client.post(
        "/v1/test/permissions/publish",
        headers=harness.csrf_header(),
    )
    assert denied.status_code == 403

    logout = harness.client.delete("/v1/session", headers=harness.csrf_header())
    assert logout.status_code == 204

    rendered_logs = "\n".join(
        JsonFormatter().format(record) for record in caplog.records
    )
    for secret in (
        login.access_token,
        bad_token,
        session_cookie,
        csrf_cookie,
        csrf_body,
    ):
        assert secret not in rendered_logs
