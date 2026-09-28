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


def _store_evidence(
    *,
    evidence_id: str,
    kind: str,
    source_type: str,
    zone_id: str,
    occurred_at: str,
    state: str = "positive",
    text: str | None = None,
):
    evidence_store.store_evidence(
        Evidence(
            id=evidence_id,
            kind=kind,
            category="fire",
            source_type=source_type,
            zone_id=zone_id,
            occurred_at=occurred_at,
            state=state,
            text=text,
        )
    )


def test_zones_status_returns_normal_for_zone_with_no_evidence(stored_evidence_database):
    assert incident_query.zones_status(["unknown-query-zone"]) == {
        "unknown-query-zone": {
            "status": "normal",
            "incident_id": None,
            "unavailable_sources": [],
        }
    }


def test_zones_status_returns_hero_incident_status(stored_evidence_database):
    zone_id = "query-hero-zone"
    _store_evidence(
        evidence_id="query-hero-report",
        kind="report",
        source_type="student",
        zone_id=zone_id,
        occurred_at="2026-01-01T12:00:00Z",
        text="Smoke and heat near the electrical room.",
    )
    _store_evidence(
        evidence_id="query-hero-smoke",
        kind="sensor",
        source_type="smoke_sensor",
        zone_id=zone_id,
        occurred_at="2026-01-01T12:05:00Z",
    )
    _store_evidence(
        evidence_id="query-hero-temperature",
        kind="sensor",
        source_type="temperature_sensor",
        zone_id=zone_id,
        occurred_at="2026-01-01T12:10:00Z",
    )

    status = incident_query.zones_status([zone_id])[zone_id]

    assert status["status"] == "critical_review"
    assert status["incident_id"] is not None
    assert status["unavailable_sources"] == []


def test_zones_status_uses_most_severe_of_separate_incidents(stored_evidence_database):
    zone_id = "query-multiple-incidents-zone"
    _store_evidence(
        evidence_id="query-early-smoke",
        kind="sensor",
        source_type="smoke_sensor",
        zone_id=zone_id,
        occurred_at="2026-01-01T12:00:00Z",
    )
    _store_evidence(
        evidence_id="query-late-report",
        kind="report",
        source_type="student",
        zone_id=zone_id,
        occurred_at="2026-01-01T12:16:00Z",
        text="Smoke and heat near the electrical room.",
    )
    _store_evidence(
        evidence_id="query-late-smoke",
        kind="sensor",
        source_type="smoke_sensor",
        zone_id=zone_id,
        occurred_at="2026-01-01T12:20:00Z",
    )
    _store_evidence(
        evidence_id="query-late-temperature",
        kind="sensor",
        source_type="temperature_sensor",
        zone_id=zone_id,
        occurred_at="2026-01-01T12:24:00Z",
    )

    incidents = [
        incident for incident in incident_query.list_incidents()
        if incident.zone_id == zone_id
    ]
    status = incident_query.zones_status([zone_id])[zone_id]

    assert len(incidents) == 2
    assert status["status"] == "critical_review"
    assert status["incident_id"] == next(
        incident.id for incident in incidents if incident.status == "critical_review"
    )


def test_zones_status_reports_unavailable_sources(stored_evidence_database):
    zone_id = "query-unavailable-zone"
    _store_evidence(
        evidence_id="query-unavailable-smoke",
        kind="sensor",
        source_type="smoke_sensor",
        zone_id=zone_id,
        occurred_at="2026-01-01T12:00:00Z",
        state="unavailable",
    )

    status = incident_query.zones_status([zone_id])[zone_id]

    assert status["status"] == "normal"
    assert status["unavailable_sources"] == ["smoke_sensor"]
