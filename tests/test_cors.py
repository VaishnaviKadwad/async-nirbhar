from fastapi.testclient import TestClient

from apps.api.main import app


def test_incidents_preflight_allows_configured_local_origin():
    with TestClient(app) as client:
        response = client.options(
            "/incidents",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_decision_preflight_allows_content_type_header():
    with TestClient(app) as client:
        response = client.options(
            "/incidents/x/decision",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "content-type" in response.headers["access-control-allow-headers"]


def test_unconfigured_origin_is_rejected():
    with TestClient(app) as client:
        response = client.get("/incidents", headers={"Origin": "http://evil.example"})

    assert "access-control-allow-origin" not in response.headers


def test_preflight_allows_requested_method_and_header_for_configured_origin():
    with TestClient(app) as client:
        response = client.options(
            "/incidents",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "x-custom-header",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "PUT" in response.headers["access-control-allow-methods"]
    assert "x-custom-header" in response.headers["access-control-allow-headers"]
