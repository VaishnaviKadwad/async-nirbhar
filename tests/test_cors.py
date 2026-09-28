from fastapi.testclient import TestClient

from apps.api.main import app


def test_incidents_preflight_allows_local_vite_origin():
    with TestClient(app) as client:
        response = client.options(
            "/incidents",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_decision_preflight_allows_content_type_header():
    with TestClient(app) as client:
        response = client.options(
            "/incidents/x/decision",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "content-type" in response.headers["access-control-allow-headers"]


def test_unlisted_origin_is_not_allowed():
    with TestClient(app) as client:
        response = client.get("/incidents", headers={"Origin": "http://evil.example"})

    assert "access-control-allow-origin" not in response.headers
