"""Smoke tests for the Phase 1 dummy routes.

These verify the wiring (paths, status codes, response shapes) without
exercising any real backend. They will be expanded once PhotoprismAdapter
is implemented.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_list_photos_returns_dummy_data():
    response = client.get("/api/v0/photos")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 1
    first = body[0]
    assert {"id", "taken_at", "folder"} <= first.keys()


def test_get_photo_image_returns_png():
    response = client.get("/api/v0/photos/p1abc123/image")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers.get("cache-control") == "public, max-age=3600"
    assert response.content.startswith(b"\x89PNG")
