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
    assert response.headers["access-control-allow-origin"] == "*"


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
    assert response.headers["access-control-allow-origin"] == "*"
    assert "content-type" in response.headers["access-control-allow-headers"]


def test_any_origin_is_allowed():
    with TestClient(app) as client:
        response = client.get("/incidents", headers={"Origin": "http://evil.example"})

    assert response.headers["access-control-allow-origin"] == "*"


def test_preflight_allows_any_method_and_header():
    with TestClient(app) as client:
        response = client.options(
            "/incidents",
            headers={
                "Origin": "https://vercel.example",
                "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "x-custom-header",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    assert response.headers["access-control-allow-methods"] == "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
    assert "x-custom-header" in response.headers["access-control-allow-headers"]
