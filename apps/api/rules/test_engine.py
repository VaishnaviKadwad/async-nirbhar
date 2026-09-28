import apps.api.rules.engine as rules_engine
from apps.api.models.evidence import Evidence
from apps.api.rules.engine import evaluate


def make_evidence(
    *,
    evidence_id: str,
    kind: str,
    source_type: str,
    state: str = "positive",
    occurred_at: str = "2026-01-01T12:00:00Z",
    zone_id: str = "zone-a",
) -> Evidence:
    return Evidence(
        id=evidence_id,
        kind=kind,
        category="fire",
        source_type=source_type,
        zone_id=zone_id,
        occurred_at=occurred_at,
        state=state,
    )


def test_fire_multi_signal_rule():
    result = evaluate(
        [
            make_evidence(evidence_id="report", kind="report", source_type="student"),
            make_evidence(evidence_id="smoke", kind="sensor", source_type="smoke_sensor"),
            make_evidence(
                evidence_id="temperature", kind="sensor", source_type="temperature_sensor"
            ),
        ]
    )

    assert result["rule"] == "fire-multi-signal"
    assert result["status"] == "critical_review"
    assert result["response"] == "restrict_access_and_dispatch_verification"
    assert result["escalate_if"]
    assert result["deescalate_if"]


def test_sensor_led_fire_rule():
    result = evaluate(
        [
            make_evidence(evidence_id="smoke", kind="sensor", source_type="smoke_sensor"),
            make_evidence(
                evidence_id="temperature", kind="sensor", source_type="temperature_sensor"
            ),
        ]
    )

    assert result["rule"] == "sensor-led-fire"
    assert result["status"] == "high_priority"
    assert result["response"] == "dispatch_verification"


def test_sensor_led_fire_with_only_smoke_positive():
    result = evaluate(
        [make_evidence(evidence_id="smoke", kind="sensor", source_type="smoke_sensor")]
    )

    assert result["rule"] == "sensor-led-fire"
    assert result["status"] == "high_priority"


def test_sensor_led_fire_with_only_temperature_abnormal():
    result = evaluate(
        [
            make_evidence(
                evidence_id="temperature", kind="sensor", source_type="temperature_sensor"
            )
        ]
    )

    assert result["rule"] == "sensor-led-fire"
    assert result["status"] == "high_priority"


def test_clustered_reports_rule():
    reports = [
        make_evidence(
            evidence_id=f"report-{minute}",
            kind="report",
            source_type="student",
            occurred_at=f"2026-01-01T12:{minute:02d}:00Z",
        )
        for minute in (0, 5, 15)
    ]

    result = evaluate(reports)

    assert result["rule"] == "clustered-reports"
    assert result["status"] == "high_priority"
    assert result["response"] == "dispatch_verification"
    assert result["facts"]["same_zone_within_minutes"] == 15


def test_single_credible_signal_rule():
    result = evaluate(
        [make_evidence(evidence_id="report", kind="report", source_type="warden")]
    )

    assert result["rule"] == "single-credible-signal"
    assert result["status"] == "attention"
    assert result["response"] == "verify_with_sop"


def test_no_match_returns_normal():
    unavailable_sensor = make_evidence(
        evidence_id="smoke",
        kind="sensor",
        source_type="smoke_sensor",
        state="unavailable",
    )

    result = evaluate([unavailable_sensor])

    assert result["rule"] is None
    assert result["status"] == "normal"
    assert result["response"] is None
    assert result["escalate_if"]
    assert result["deescalate_if"]


def test_fire_multi_signal_wins_when_loaded_rules_dict_is_reversed(monkeypatch):
    reversed_rules = dict(reversed(list(rules_engine.RULES_BY_ID.items())))
    monkeypatch.setattr(rules_engine, "RULES_BY_ID", reversed_rules)

    evidence_group = [
        make_evidence(
            evidence_id=f"report-{minute}",
            kind="report",
            source_type="student",
            occurred_at=f"2026-01-01T12:{minute:02d}:00Z",
        )
        for minute in (0, 5, 10)
    ] + [
        make_evidence(evidence_id="smoke", kind="sensor", source_type="smoke_sensor"),
        make_evidence(
            evidence_id="temperature", kind="sensor", source_type="temperature_sensor"
        ),
    ]

    result = evaluate(evidence_group)

    assert result["rule"] == "fire-multi-signal"
    assert result["status"] == "critical_review"
