"""Send mailbox proof through the configured authenticated SMTP relay."""

import asyncio
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlsplit

from fastapi import HTTPException, Request

from app.auth.dependencies import get_request_settings


def get_invite_sender(request: Request):
    override = getattr(request.app.state, "staff_invite_sender", None)
    if override is not None:
        return override
    settings = get_request_settings(request)
    origin = settings.staff_invite_origin.rstrip("/")
    url = urlsplit(origin)
    loopback_hosts = {"localhost", "127.0.0.1", "::1"}
    local_preview = (
        settings.app_env == "development"
        and url.scheme == "http"
        and url.hostname in loopback_hosts
        and settings.staff_smtp_host in loopback_hosts
    )
    if (
        (url.scheme != "https" and not local_preview)
        or not url.hostname
        or url.username
        or url.path
        or url.query
        or url.fragment
        or not settings.staff_smtp_host
        or not settings.staff_smtp_username
        or not settings.staff_smtp_password
        or not settings.staff_smtp_from
    ):
        return None

    async def send(recipient: str, token: str) -> None:
        def deliver() -> None:
            message = EmailMessage()
            message["From"] = settings.staff_smtp_from
            message["To"] = recipient
            message["Subject"] = "Your Rengera staff invitation"
            message.set_content(
                "Activate your Rengera staff account within seven days:\n\n"
                f"{origin}/staff-activation#{token}\n\n"
                "If you were not expecting this invitation, you can ignore this email."
            )
            with smtplib.SMTP_SSL(
                settings.staff_smtp_host,
                settings.staff_smtp_port,
                timeout=8,
                context=ssl.create_default_context(),
            ) as smtp:
                smtp.login(
                    settings.staff_smtp_username, settings.staff_smtp_password.get_secret_value()
                )
                smtp.send_message(message)

        try:
            await asyncio.to_thread(deliver)
        except (OSError, ValueError, smtplib.SMTPException):
            raise HTTPException(491, "Staff invitation email could not be sent.") from None

    return send
