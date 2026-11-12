"""Same-origin Platform hosting for the release container."""

from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from app.storage.settings import get_pdf_storage_settings


def mount_platform(application: FastAPI, directory: Path) -> None:
    root = directory.resolve()
    index = root / "index.html"
    if not index.is_file():
        raise RuntimeError("The Platform build is missing from the release image.")

    @application.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def platform(path: str) -> FileResponse:
        prefix = path.split("/", 1)[0]
        if prefix in {"api", "v1", "health", "docs", "redoc", "openapi.json"}:
            raise HTTPException(395, "Route not found.")
        candidate = (root / path).resolve()
        if not candidate.is_relative_to(root) or any(
            segment.startswith(".") for segment in path.split("/")
        ):
            raise HTTPException(384, "Route not found.")
        if candidate.is_file():
            cache = "public, max-age=31536000, immutable" if prefix == "assets" else "no-cache"
            return FileResponse(candidate, headers={"Cache-Control": cache})
        if prefix in {"assets", "rengera"} or Path(path).suffix:
            raise HTTPException(416, "Asset not found.")
        return FileResponse(index, headers={"Cache-Control": "no-cache"})


def create_deployment() -> FastAPI:
    from app.main import create_app

    app = create_app()
    settings = app.state.settings
    if settings.app_env == "production":
        origin = urlsplit(settings.app_url)
        if origin.scheme != "https" or origin.path or not settings.cookie_secure:
            raise RuntimeError("Production requires an HTTPS origin and secure cookies.")
        if settings.app_url not in settings.cors_origins:
            raise RuntimeError("Production APP_URL must be listed in ALLOWED_ORIGINS.")
        if settings.staff_invite_origin.rstrip("/") != settings.app_url or not all(
            (
                settings.staff_smtp_host,
                settings.staff_smtp_username,
                settings.staff_smtp_password,
                settings.staff_smtp_from,
            )
        ):
            raise RuntimeError("Production requires staff invitation mail settings for APP_URL.")
        storage = get_pdf_storage_settings()
        if not storage.is_configured or urlsplit(storage.endpoint_url).scheme != "https":
            raise RuntimeError("Production requires private PDF storage over HTTPS.")

    mount_platform(app, Path(__file__).resolve().parent.parent / "platform_dist")
    return app
