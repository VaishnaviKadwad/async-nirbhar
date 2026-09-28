from apps.api.correlation.correlate import correlate
from apps.api.models.evidence import Evidence


def make_evidence(
    *,
    evidence_id: str,
    kind: str,
    source_type: str,
    occurred_at: str,
    zone_id: str = "block-c-electrical-room",
    state: str = "positive",
    text: str | None = None,
) -> Evidence:
    return Evidence(
        id=evidence_id,
        kind=kind,
        category="fire",
        source_type=source_type,
        zone_id=zone_id,
        occurred_at=occurred_at,
        state=state,
        text=text,
    )


def test_hero_scenario_groups_three_items_into_one_incident():
    evidence = [
        make_evidence(
            evidence_id="report-1",
            kind="report",
            source_type="student",
            occurred_at="2026-01-01T12:00:00Z",
            text="Smoke and heat near the electrical room.",
        ),
        make_evidence(
            evidence_id="smoke-1",
            kind="sensor",
            source_type="smoke_sensor",
            occurred_at="2026-01-01T12:05:00Z",
        ),
        make_evidence(
            evidence_id="temperature-1",
            kind="sensor",
            source_type="temperature_sensor",
            occurred_at="2026-01-01T12:10:00Z",
        ),
    ]

    incidents = correlate(evidence)

    assert len(incidents) == 1
    assert len(incidents[0].evidence) == 3
    assert incidents[0].zone_id == "block-c-electrical-room"
    assert incidents[0].status == "critical_review"
    assert incidents[0].response == "restrict_access_and_dispatch_verification"
    assert incidents[0].correlation_reason


def test_evidence_in_different_zones_never_group_together():
    evidence = [
        make_evidence(
            evidence_id="smoke-room-a",
            kind="sensor",
            source_type="smoke_sensor",
            occurred_at="2026-01-01T12:00:00Z",
            zone_id="room-a",
        ),
        make_evidence(
            evidence_id="temperature-room-b",
            kind="sensor",
            source_type="temperature_sensor",
            occurred_at="2026-01-01T12:01:00Z",
            zone_id="room-b",
        ),
    ]

    incidents = correlate(evidence)

    assert len(incidents) == 2
    assert all(len(incident.evidence) == 1 for incident in incidents)
    assert {incident.zone_id for incident in incidents} == {"room-a", "room-b"}


def test_unavailable_sensor_is_listed_without_changing_positive_rule_status():
    positive_evidence = [
        make_evidence(
            evidence_id="positive-report",
            kind="report",
            source_type="student",
            occurred_at="2026-01-01T12:00:00Z",
            text="Smoke and heat near the electrical room.",
        ),
        make_evidence(
            evidence_id="positive-temperature",
            kind="sensor",
            source_type="temperature_sensor",
            occurred_at="2026-01-01T12:05:00Z",
        ),
    ]
    unavailable_group = [
        *positive_evidence,
        make_evidence(
            evidence_id="unavailable-smoke",
            kind="sensor",
            source_type="smoke_sensor",
            occurred_at="2026-01-01T12:03:00Z",
            state="unavailable",
        ),
    ]

    positive_incident = correlate(positive_evidence)[0]
    incident = correlate(unavailable_group)[0]

    assert incident.unavailable_sources == ["smoke_sensor"]
    assert incident.status == positive_incident.status


def test_group_without_unavailable_evidence_has_empty_unavailable_sources():
    incident = correlate(
        [
            make_evidence(
                evidence_id="normal-report",
                kind="report",
                source_type="student",
                occurred_at="2026-01-01T12:00:00Z",
                state="normal",
            )
        ]
    )[0]

    assert incident.unavailable_sources == []


def test_all_unavailable_group_keeps_normal_status_and_lists_sources():
    incident = correlate(
        [
            make_evidence(
                evidence_id="unavailable-smoke",
                kind="sensor",
                source_type="smoke_sensor",
                occurred_at="2026-01-01T12:00:00Z",
                state="unavailable",
            ),
            make_evidence(
                evidence_id="unavailable-temperature",
                kind="sensor",
                source_type="temperature_sensor",
                occurred_at="2026-01-01T12:01:00Z",
                state="unavailable",
            ),
            make_evidence(
                evidence_id="unavailable-smoke-again",
                kind="sensor",
                source_type="smoke_sensor",
                occurred_at="2026-01-01T12:02:00Z",
                state="unavailable",
            ),
        ]
    )[0]

    assert incident.status == "normal"
    assert incident.unavailable_sources == ["smoke_sensor", "temperature_sensor"]


def test_unavailable_smoke_sensor_does_not_change_status_with_positive_signals():
    positive_evidence = [
        make_evidence(
            evidence_id="positive-report-1",
            kind="report",
            source_type="student",
            occurred_at="2026-01-01T12:00:00Z",
            text="Smoke and heat near the electrical room.",
        ),
        make_evidence(
            evidence_id="positive-report-2",
            kind="report",
            source_type="student",
            occurred_at="2026-01-01T12:02:00Z",
            text="Smoke and heat near the electrical room.",
        ),
        make_evidence(
            evidence_id="positive-temperature",
            kind="sensor",
            source_type="temperature_sensor",
            occurred_at="2026-01-01T12:04:00Z",
        ),
    ]
    unavailable_smoke = make_evidence(
        evidence_id="unavailable-smoke",
        kind="sensor",
        source_type="smoke_sensor",
        occurred_at="2026-01-01T12:03:00Z",
        state="unavailable",
    )

    baseline_incident = correlate(positive_evidence)[0]
    incident_with_unavailable_smoke = correlate(
        [*positive_evidence, unavailable_smoke]
    )[0]

    assert incident_with_unavailable_smoke.status == baseline_incident.status
    assert incident_with_unavailable_smoke.unavailable_sources == ["smoke_sensor"]
