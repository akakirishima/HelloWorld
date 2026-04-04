from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.middleware import network_access


def test_network_access_allows_requests_within_lab_subnet(monkeypatch) -> None:
    settings = Settings(allowed_subnets=["172.16.1.0/24"])
    monkeypatch.setattr(network_access, "get_settings", lambda: settings)

    client = TestClient(app)
    response = client.get("/api/health", headers={"x-forwarded-for": "172.16.1.55"})

    assert response.status_code == 200


def test_network_access_blocks_requests_outside_lab_subnet(monkeypatch) -> None:
    settings = Settings(allowed_subnets=["172.16.1.0/24"])
    monkeypatch.setattr(network_access, "get_settings", lambda: settings)

    client = TestClient(app)
    response = client.get("/api/health", headers={"x-forwarded-for": "192.168.1.20"})

    assert response.status_code == 403
    assert response.json()["detail"] == "Access is limited to the laboratory network."
