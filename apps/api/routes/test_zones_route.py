from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.routes import zones as zones_route


def test_get_zones_uses_known_zone_ids_and_returns_query_status(monkeypatch):
    expected_zone_ids = [
        "block-c-electrical-room",
        "room-a",
        "room-b",
        "room-c",
    ]
    expected_status = {
        zone_id: {
            "status": "normal",
            "incident_id": None,
            "unavailable_sources": [],
        }
        for zone_id in expected_zone_ids
    }
    calls = []

    def fake_zones_status(zone_ids):
        calls.append(zone_ids)
        return expected_status

    monkeypatch.setattr(zones_route, "zones_status", fake_zones_status)

    with TestClient(app) as client:
        response = client.get("/zones")

    assert response.status_code == 200
    assert response.json() == expected_status
    assert calls == [expected_zone_ids]
