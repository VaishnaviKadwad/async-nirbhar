from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel

from apps.api.models.evidence import Evidence
from apps.api.rules.engine import evaluate


CORRELATION_WINDOW_MINUTES = 15
SIMILARITY_THRESHOLD = 0.70


class Incident(BaseModel):
    id: str
    zone_id: str
    evidence: list[Evidence]
    correlation_reason: str
    status: Literal["normal", "attention", "high_priority", "critical_review"]
    response: str
    escalate_if: str
    deescalate_if: str


def _occurred_at(evidence: Evidence) -> datetime:
    timestamp = evidence.occurred_at
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc)


def _mock_text_similarity(first: str, second: str) -> float:
    """Placeholder similarity score; Member A will replace this with embeddings."""
    return 0.85 if first.strip() and second.strip() else 0.0


def _reports_are_similar(candidate: Evidence, group: list[Evidence]) -> bool:
    if candidate.kind != "report" or not candidate.text:
        return True

    for existing in group:
        if existing.kind != "report" or not existing.text:
            continue
        if _mock_text_similarity(candidate.text, existing.text) < SIMILARITY_THRESHOLD:
            return False
    return True


def _make_incident(group: list[Evidence], timestamps: list[datetime]) -> Incident:
    rule_result = evaluate(group)
    span_minutes = (max(timestamps) - min(timestamps)).total_seconds() / 60
    reason = (
        f"Grouped {len(group)} evidence items in zone {group[0].zone_id} "
        f"within {span_minutes:g} minutes; report text similarity met the "
        f"{SIMILARITY_THRESHOLD:.2f} threshold where applicable."
    )
    return Incident(
        id=str(uuid4()),
        zone_id=group[0].zone_id,
        evidence=group,
        correlation_reason=reason,
        status=rule_result["status"],
        response=rule_result["response"] or "no_action",
        escalate_if=rule_result["escalate_if"],
        deescalate_if=rule_result["deescalate_if"],
    )


def correlate(all_evidence: list[Evidence]) -> list[Incident]:
    """Group evidence by zone, a rolling 15-minute window, and report similarity."""
    ordered_evidence = sorted(all_evidence, key=_occurred_at)
    groups: list[list[Evidence]] = []
    group_timestamps: list[list[datetime]] = []

    for candidate in ordered_evidence:
        candidate_time = _occurred_at(candidate)
        matching_group = None
        for index, group in enumerate(groups):
            timestamps = group_timestamps[index]
            if group[0].zone_id != candidate.zone_id:
                continue
            if (candidate_time - timestamps[0]).total_seconds() > CORRELATION_WINDOW_MINUTES * 60:
                continue
            if not _reports_are_similar(candidate, group):
                continue
            matching_group = index
            break

        if matching_group is None:
            groups.append([candidate])
            group_timestamps.append([candidate_time])
        else:
            groups[matching_group].append(candidate)
            group_timestamps[matching_group].append(candidate_time)

    return [
        _make_incident(group, timestamps)
        for group, timestamps in zip(groups, group_timestamps)
    ]
