from copy import deepcopy


mock_incident = {
    "id": "INC-DEMO-001",
    "zone_id": "block-c-electrical-room",
    "evidence": [
        {
            "id": "evt-room-a-report-001",
            "kind": "report",
            "category": "fire_hazard",
            "source_type": "student",
            "zone_id": "block-c-electrical-room",
            "occurred_at": "2026-10-01T09:00:00+05:30",
            "state": "positive",
            "text": "Smoke near Block C electrical room",
            "synthetic": True,
        },
        {
            "id": "evt-room-a-report-002",
            "kind": "report",
            "category": "fire_hazard",
            "source_type": "guard",
            "zone_id": "block-c-electrical-room",
            "occurred_at": "2026-10-01T09:04:00+05:30",
            "state": "positive",
            "text": "Burning smell reported near electrical room",
            "synthetic": True,
        },
        {
            "id": "evt-room-a-sensor-001",
            "kind": "sensor",
            "category": "fire_hazard",
            "source_type": "temperature_sensor",
            "zone_id": "block-c-electrical-room",
            "occurred_at": "2026-10-01T09:06:00+05:30",
            "state": "positive",
            "value": 68.0,
            "unit": "C",
            "synthetic": True,
        },
    ],
    "correlation_reason": "Student report, guard report, and sensor spike all in the same zone within a short window",
    "status": "critical_review",
    "response": "restrict_access_and_dispatch_verification",
    "escalate_if": "temperature continues rising or a second independent report comes in",
    "deescalate_if": "sensor reading returns to baseline and no further reports arrive",
}


def get_mock_incident() -> dict:
    return deepcopy(mock_incident)


def list_mock_incidents() -> list[dict]:
    return [get_mock_incident()]


def get_incident(incident_id: str) -> dict | None:
    incident = get_mock_incident()
    return incident if incident["id"] == incident_id else None


def list_incidents() -> list[dict]:
    return list_mock_incidents()
