import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

import apps.api.routes.evidence as evidence_route
import apps.api.storage.evidence_store as evidence_store
from apps.api.main import app


@pytest.fixture
def client_with_temporary_evidence_database(tmp_path, monkeypatch):
    database_path = tmp_path / "evidence.sqlite3"
    test_engine = create_engine(f"sqlite:///{database_path.as_posix()}")
    monkeypatch.setattr(evidence_store, "DATABASE_PATH", database_path)
    monkeypatch.setattr(evidence_store, "engine", test_engine)

    with TestClient(app) as client:
        yield client

    test_engine.dispose()


def test_post_evidence_duplicate_id_returns_conflict(client_with_temporary_evidence_database):
    payload = {
        "id": "route-test-evidence",
        "kind": "report",
        "category": "fire",
        "source_type": "student",
        "zone_id": "route-test-zone",
        "occurred_at": "2026-01-01T12:00:00Z",
        "state": "positive",
        "text": "Smoke was reported near the storage room.",
    }

    first_response = client_with_temporary_evidence_database.post("/evidence", json=payload)
    second_response = client_with_temporary_evidence_database.post("/evidence", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_post_evidence_invalid_occurred_at_returns_unprocessable_entity(
    client_with_temporary_evidence_database,
):
    response = client_with_temporary_evidence_database.post(
        "/evidence",
        json={
            "id": "route-test-invalid-time",
            "kind": "report",
            "category": "fire",
            "source_type": "student",
            "zone_id": "route-test-zone",
            "occurred_at": "not-a-timestamp",
            "state": "positive",
        },
    )

    assert response.status_code == 422


def test_post_evidence_audit_payload_is_json_serializable(
    client_with_temporary_evidence_database, monkeypatch
):
    recorded_events = []

    def record_event(event_type, payload):
        recorded_events.append((event_type, payload))

    monkeypatch.setattr(evidence_route, "append_event", record_event)

    response = client_with_temporary_evidence_database.post(
        "/evidence",
        json={
            "id": "route-test-audit-payload",
            "kind": "report",
            "category": "fire",
            "source_type": "student",
            "zone_id": "route-test-zone",
            "occurred_at": "2026-01-01T12:00:00Z",
            "state": "positive",
        },
    )

    assert response.status_code == 201
    assert len(recorded_events) == 1
    _, recorded_payload = recorded_events[0]
    json.dumps(recorded_payload)
    assert isinstance(recorded_payload["occurred_at"], str)
