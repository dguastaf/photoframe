"""CORS middleware and settings."""

from fastapi.testclient import TestClient

from app.config import Settings, settings
from app.main import app
from app.ports import CLIENT_DEV_ORIGIN


def test_cors_origins_parsed_from_comma_separated_env(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://a.test:3000, http://b.test:4000")
    parsed = Settings()
    assert parsed.cors_origins == ["http://a.test:3000", "http://b.test:4000"]


def test_cors_origins_default_to_client_dev_origin_from_ports(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    parsed = Settings()
    assert parsed.cors_origins == [CLIENT_DEV_ORIGIN]


def test_cors_preflight_allows_configured_origin():
    client = TestClient(app)
    origin = CLIENT_DEV_ORIGIN
    response = client.options(
        "/api/v0/photos",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_get_includes_allow_origin_header():
    client = TestClient(app)
    origin = CLIENT_DEV_ORIGIN
    response = client.get("/health", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
