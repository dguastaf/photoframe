"""Static UI mount must not shadow API routes (Docker production layout)."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.testclient import TestClient

from app.api import api_router
from app.api import health


def _app_with_static_ui(static_dir: Path) -> FastAPI:
    """Mirror main.py registration order: API routers, then / static catch-all."""
    application = FastAPI()
    application.include_router(health.router)
    application.include_router(api_router)
    application.mount(
        "/",
        StaticFiles(directory=static_dir, html=True),
        name="ui",
    )
    return application


def test_api_routes_reach_handlers_when_static_mounted_at_root(tmp_path: Path):
    (tmp_path / "index.html").write_text("<html>ui</html>", encoding="utf-8")

    with TestClient(_app_with_static_ui(tmp_path)) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.headers["content-type"].startswith("application/json")
        assert health.json() == {"ok": True}

        missing_api_path = client.get("/api/v0/does-not-exist")
        assert missing_api_path.status_code == 404
        assert "application/json" in missing_api_path.headers["content-type"]

        ui = client.get("/")
        assert ui.status_code == 200
        assert "text/html" in ui.headers["content-type"]
