from fastapi.testclient import TestClient

import apps.api.main as main


def test_app_waits_for_warmup_before_serving_requests(monkeypatch):
    state = {"warmed": False}

    def warm_up(incident=None):
        state["warmed"] = True
        return True

    monkeypatch.setattr(main, "warm_up_ollama", warm_up)

    with TestClient(main.app) as client:
        assert state["warmed"] is True
        assert client.get("/incidents").status_code == 200


def test_health_endpoint_reports_ready():
    with TestClient(main.app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
