Incident {
  id: string
  zone_id: string
  evidence: [Evidence]              # from the evidence schema
  correlation_reason: string        # plain-language grouping reason
  status: "normal" | "attention" | "high_priority" | "critical_review"
  response: string                  # e.g. "restrict_access_and_dispatch_verification"
  escalate_if: string
  deescalate_if: string
}

Evidence {
  id: string
  kind: "report" | "sensor"
  category: string
  source_type: "student" | "guard" | "warden" | "smoke_sensor" | "temperature_sensor"
  zone_id: string
  occurred_at: string   # ISO 8601, e.g. "2026-10-01T09:00:00+05:30"
  state: "positive" | "normal" | "unavailable" | "contradictory"
  text: string, optional      # present for reports, omitted for sensor readings
  value: float, optional      # present for sensor readings only
  unit: string, optional      # present for sensor readings only
  synthetic: boolean          # always true for seed/demo data
}

[
  {
    "id": "evt-room-a-report-001",
    "kind": "report",
    "category": "fire_hazard",
    "source_type": "student",
    "zone_id": "block-c-electrical-room",
    "occurred_at": "2026-10-01T09:00:00+05:30",
    "state": "positive",
    "text": "Smoke near Block C electrical room",
    "synthetic": true
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
    "synthetic": true
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
    "synthetic": true
  }
]

append_event(event_type: string, payload: dict) -> None   # audit function signature
