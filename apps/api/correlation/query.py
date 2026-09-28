import json
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select

from apps.api.correlation.correlate import Incident, correlate
from apps.api.models.evidence import Evidence
from apps.api.storage.evidence_store import DATABASE_PATH, engine, evidence_table


def _current_incidents() -> list[Incident]:
    if not DATABASE_PATH.exists():
        return []

    with engine.connect() as connection:
        stored_rows = connection.execute(select(evidence_table)).mappings().all()

    all_evidence = [Evidence(**row) for row in stored_rows]
    incidents = correlate(all_evidence)

    # Correlation creates fresh UUIDs per call; stable IDs let list/get share a result identity.
    for incident in incidents:
        identity = json.dumps(
            {
                "zone_id": incident.zone_id,
                "evidence_ids": sorted(item.id for item in incident.evidence),
            },
            separators=(",", ":"),
        )
        incident.id = str(uuid5(NAMESPACE_URL, f"nirbhar:incident:{identity}"))

    return incidents


def list_incidents() -> list[Incident]:
    """Return all current incidents, each with exactly these fields: `id` (str),
    `zone_id` (str), `evidence` (list[Evidence]), `correlation_reason` (str),
    `status` (normal, attention, high_priority, or critical_review), `response`
    (str), `escalate_if` (str), and `deescalate_if` (str).
    """
    return _current_incidents()


def get_incident(id: str) -> Incident | None:
    """Return the current incident matching `id`, or `None`; an Incident has
    exactly these fields: `id` (str), `zone_id` (str), `evidence`
    (list[Evidence]), `correlation_reason` (str), `status` (normal, attention,
    high_priority, or critical_review), `response` (str), `escalate_if` (str),
    and `deescalate_if` (str).
    """
    return next((incident for incident in _current_incidents() if incident.id == id), None)
