from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deployment import mount_platform


def test_release_serves_platform_and_preserves_api_and_asset_errors(tmp_path):
    (tmp_path / "index.html").write_text("<html>Platform</html>")
    assets = tmp_path / "assets"
    assets.mkdir()
    (assets / "bundle.js").write_text("console.log('Platform');")
    app = FastAPI()

    @app.get("/v1/example")
    def example():
        return {"api": True}

    mount_platform(app, tmp_path)
    with TestClient(app) as client:
        assert client.get("/v1/example").json() == {"api": True}
        for path in ("/", "/403", "/staff-activation", "/library/law/example"):
            result = client.get(path)
            assert result.status_code == 200
            assert result.headers["Cache-Control"] == "no-cache"
            assert "Platform" in result.text
        assert client.head("/403").status_code == 200
        assert "immutable" in client.get("/assets/bundle.js").headers["Cache-Control"]
        for path in ("/v1/missing", "/api/missing", "/health/missing", "/assets/missing.js"):
            assert client.get(path).status_code == 404
