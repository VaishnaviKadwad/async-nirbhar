from apps.api.correlation.correlate import correlate
from apps.api.models.evidence import Evidence


def evidence(
    *,
    evidence_id: str,
    kind: str,
    source_type: str,
    zone_id: str,
    occurred_at: str,
    text: str | None = None,
) -> Evidence:
    return Evidence(
        id=evidence_id,
        kind=kind,
        category="fire",
        source_type=source_type,
        zone_id=zone_id,
        occurred_at=occurred_at,
        state="positive",
        text=text,
    )


def test_all_three_rooms_produce_separate_incidents_with_expected_statuses():
    all_evidence = [
        # Room A: the hero report pair, temperature spike, and smoke signal.
        evidence(
            evidence_id="room-a-student-report",
            kind="report",
            source_type="student",
            zone_id="room-a",
            occurred_at="2026-01-01T12:00:00Z",
            text="Smoke and heat reported near the electrical room.",
        ),
        evidence(
            evidence_id="room-a-guard-report",
            kind="report",
            source_type="guard",
            zone_id="room-a",
            occurred_at="2026-01-01T12:02:00Z",
            text="Smoke and heat noticed near the electrical room.",
        ),
        evidence(
            evidence_id="room-a-temperature-spike",
            kind="sensor",
            source_type="temperature_sensor",
            zone_id="room-a",
            occurred_at="2026-01-01T12:03:00Z",
        ),
        evidence(
            evidence_id="room-a-smoke-reading",
            kind="sensor",
            source_type="smoke_sensor",
            zone_id="room-a",
            occurred_at="2026-01-01T12:04:00Z",
        ),
        # Room B: one positive temperature sensor signal and no reports.
        evidence(
            evidence_id="room-b-temperature-spike",
            kind="sensor",
            source_type="temperature_sensor",
            zone_id="room-b",
            occurred_at="2026-01-01T12:01:00Z",
        ),
        # Room C: one mild student report and no sensor data.
        evidence(
            evidence_id="room-c-student-report",
            kind="report",
            source_type="student",
            zone_id="room-c",
            occurred_at="2026-01-01T12:04:00Z",
            text="A mild burning smell was reported.",
        ),
    ]

    incidents = correlate(all_evidence)

    assert len(incidents) == 3
    incidents_by_zone = {incident.zone_id: incident for incident in incidents}
    assert set(incidents_by_zone) == {"room-a", "room-b", "room-c"}
    assert len(incidents_by_zone["room-a"].evidence) == 4
    assert incidents_by_zone["room-a"].status == "critical_review"
    assert incidents_by_zone["room-b"].status == "high_priority"
    assert incidents_by_zone["room-c"].status == "attention"
