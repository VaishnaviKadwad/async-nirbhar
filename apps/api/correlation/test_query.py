import pytest
from sqlalchemy import create_engine

import apps.api.correlation.query as incident_query
import apps.api.storage.evidence_store as evidence_store
from apps.api.models.evidence import Evidence


@pytest.fixture
def stored_evidence_database(tmp_path, monkeypatch):
    database_path = tmp_path / "evidence.sqlite3"
    test_engine = create_engine(f"sqlite:///{database_path.as_posix()}")
    monkeypatch.setattr(incident_query, "DATABASE_PATH", database_path)
    monkeypatch.setattr(incident_query, "engine", test_engine)
    monkeypatch.setattr(evidence_store, "engine", test_engine)

    evidence_store.store_evidence(
        Evidence(
            id="query-test-report",
            kind="report",
            category="fire",
            source_type="student",
            zone_id="query-test-zone",
            occurred_at="2026-01-01T12:00:00Z",
            state="positive",
            text="Smoke was reported near the storage room.",
        )
    )

    yield
    test_engine.dispose()


def test_list_incidents_returns_incidents_for_stored_evidence(stored_evidence_database):
    incidents = incident_query.list_incidents()

    assert len(incidents) >= 1
    assert incidents[0].zone_id == "query-test-zone"


def test_get_incident_returns_incident_listed_by_list_incidents(stored_evidence_database):
    listed_incident = incident_query.list_incidents()[0]

    result = incident_query.get_incident(listed_incident.id)

    assert result is not None
    assert result.id == listed_incident.id
    assert result.zone_id == listed_incident.zone_id


def test_get_incident_returns_none_for_nonexistent_id(stored_evidence_database):
    assert incident_query.get_incident("nonexistent-incident-id") is None
