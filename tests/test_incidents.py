from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.routes import incidents as incidents_routes
from tests.fixtures import mock_incident as mock_incident_fixture


client = TestClient(app)


@pytest.fixture(autouse=True)
def use_fixed_mock_incident(monkeypatch):
    # These tests exercise decision/audit logic against a fixed incident; real correlation is covered by the hero-scenario integration test.
    monkeypatch.setattr(incidents_routes, "list_incidents", mock_incident_fixture.list_incidents)
    monkeypatch.setattr(incidents_routes, "get_incident", mock_incident_fixture.get_incident)


@pytest.fixture
def isolated_audit_log(monkeypatch, tmp_path):
    from apps.api.audit import audit_log

    monkeypatch.setattr(audit_log, "DB_PATH", tmp_path / "audit.db")
    audit_log._initialize_database()
    return audit_log


def test_list_incidents_returns_hero_incident_with_review_required_citation():
    response = client.get("/incidents")

    assert response.status_code == 200
    incidents = response.json()
    assert len(incidents) == 1
    assert incidents[0]["id"] == "INC-DEMO-001"
    assert incidents[0]["sop_citation"] == "Review Required"


def test_get_incident_returns_matching_incident_with_citation():
    response = client.get("/incidents/INC-DEMO-001")

    assert response.status_code == 200
    assert response.json()["id"] == "INC-DEMO-001"
    assert response.json()["sop_citation"] == "Review Required"


def test_get_incident_returns_clear_404_for_unknown_id():
    response = client.get("/incidents/does-not-exist")

    assert response.status_code == 404
    assert response.json()["detail"] == "Incident 'does-not-exist' not found"


@pytest.mark.parametrize("action", ["approve", "modify"])
def test_approve_and_modify_record_decisions_without_fake_tickets(action, isolated_audit_log):
    reason = "Officer's decision rationale" if action == "modify" else None

    response = client.post(
        "/incidents/INC-DEMO-001/decision",
        json={"action": action, "reason": reason, "officer_id": "officer-123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ticket"] is None
    assert body["action"] == action
    assert body["reason"] == reason
    assert body["officer_id"] == "officer-123"
    assert isolated_audit_log.get_all_events()[0]["payload"]["outcome"] == "decision_recorded"


def test_reject_records_decision_without_creating_external_response(isolated_audit_log):
    response = client.post(
        "/incidents/INC-DEMO-001/decision",
        json={"action": "reject", "reason": "No hazard found", "officer_id": "officer-123"},
    )

    assert response.status_code == 200
    assert response.json()["ticket"] is None
    assert isolated_audit_log.get_all_events()[0]["payload"]["outcome"] == "decision_recorded"


@pytest.mark.parametrize("action", ["modify", "reject"])
def test_modify_and_reject_require_non_whitespace_reason(action, isolated_audit_log):
    response = client.post(
        "/incidents/INC-DEMO-001/decision",
        json={"action": action, "reason": "  ", "officer_id": "officer-123"},
    )

    assert response.status_code == 422
    assert isolated_audit_log.get_all_events()[0]["payload"]["outcome"] == "invalid_reason"


def test_unknown_incident_is_checked_before_missing_reason_and_logged(isolated_audit_log):
    response = client.post(
        "/incidents/not-found/decision",
        json={"action": "modify", "officer_id": "officer-123"},
    )

    assert response.status_code == 404
    assert isolated_audit_log.get_all_events()[0]["payload"]["outcome"] == "incident_not_found"


@pytest.mark.parametrize("action,reason", [("approve", None), ("modify", "Changed rationale")])
def test_second_approval_or_modification_conflicts_but_is_logged(
    action, reason, isolated_audit_log
):
    first = client.post(
        "/incidents/INC-DEMO-001/decision",
        json={"action": "approve", "officer_id": "officer-first"},
    )
    assert first.status_code == 200

    second = client.post(
        "/incidents/INC-DEMO-001/decision",
        json={"action": action, "reason": reason, "officer_id": "officer-second"},
    )

    assert second.status_code == 409
    assert second.json() == {"detail": "Incident already has a recorded decision"}
    events = isolated_audit_log.get_all_events()
    assert len(events) == 2
    assert events[1]["payload"]["outcome"] == "already_decided"


def test_reject_remains_allowed_after_approval(isolated_audit_log):
    first = client.post(
        "/incidents/INC-DEMO-001/decision",
        json={"action": "approve", "officer_id": "officer-first"},
    )
    reject = client.post(
        "/incidents/INC-DEMO-001/decision",
        json={"action": "reject", "reason": "Later officer rejection", "officer_id": "officer-2"},
    )

    assert first.status_code == 200
    assert reject.status_code == 200
    assert reject.json()["ticket"] is None
    assert len(isolated_audit_log.get_all_events()) == 2


def test_concurrent_approve_requests_record_exactly_one_decision(isolated_audit_log, monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "false")
    ready = Barrier(2)

    def approve(officer_id):
        with TestClient(app) as concurrent_client:
            ready.wait(timeout=5)
            return concurrent_client.post(
                "/incidents/INC-DEMO-001/decision",
                json={"action": "approve", "officer_id": officer_id},
            )

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(approve, ["officer-a", "officer-b"]))

    assert sorted(response.status_code for response in responses) == [200, 409]
    success = next(response for response in responses if response.status_code == 200)
    conflict = next(response for response in responses if response.status_code == 409)
    assert success.json()["ticket"] is None
    assert conflict.json() == {"detail": "Incident already has a recorded decision"}

    outcomes = [event["payload"]["outcome"] for event in isolated_audit_log.get_all_events()]
    assert sorted(outcomes) == ["already_decided", "decision_recorded"]


def test_get_incident_explanation_returns_generated_fields(monkeypatch):
    incident = mock_incident_fixture.get_incident("INC-DEMO-001")
    explanation = {
        "summary": "Three signals indicate a fire hazard.",
        "citation": "Review Required",
        "uncertainty": "high",
        "escalate_if": incident["escalate_if"],
        "deescalate_if": incident["deescalate_if"],
    }
    calls = []

    def fake_generate_explanation(actual_incident, citation):
        calls.append((actual_incident, citation))
        return explanation

    monkeypatch.setattr(
        incidents_routes, "generate_explanation", fake_generate_explanation
    )

    response = client.get("/incidents/INC-DEMO-001/explanation")

    assert response.status_code == 200
    assert response.json() == explanation
    assert set(response.json()) == {
        "summary",
        "citation",
        "uncertainty",
        "escalate_if",
        "deescalate_if",
    }
    assert calls == [(incident, "Review Required")]


def test_get_unknown_incident_explanation_does_not_generate(monkeypatch):
    calls = []
    monkeypatch.setattr(
        incidents_routes,
        "generate_explanation",
        lambda *args: calls.append(args),
    )

    response = client.get("/incidents/not-found/explanation")

    assert response.status_code == 404
    assert response.json() == {"detail": "Incident 'not-found' not found"}
    assert calls == []


def test_get_incident_explanation_uses_deterministic_fallback(monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "false")
    incident = mock_incident_fixture.get_incident("INC-DEMO-001")

    response = client.get("/incidents/INC-DEMO-001/explanation")

    assert response.status_code == 200
    body = response.json()
    assert body["uncertainty"] == "high"
    assert body["citation"] == "Review Required"
    assert body["escalate_if"] == incident["escalate_if"]
    assert body["deescalate_if"] == incident["deescalate_if"]
