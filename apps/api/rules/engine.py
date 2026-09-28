from datetime import datetime, timezone
from math import inf
from pathlib import Path
from typing import Any

import yaml

from apps.api.models.evidence import Evidence


RULES_PATH = Path(__file__).with_name("rules.yaml")
SEVERITY_ORDER = [
    "fire-multi-signal",
    "sensor-led-fire",
    "clustered-reports",
    "single-credible-signal",
]

with RULES_PATH.open("r", encoding="utf-8") as rules_file:
    RULES_BY_ID = {rule["id"]: rule for rule in yaml.safe_load(rules_file)}

_MISSING_RULES = [rule_id for rule_id in SEVERITY_ORDER if rule_id not in RULES_BY_ID]
if _MISSING_RULES:
    raise ValueError(f"Missing required rules in {RULES_PATH}: {', '.join(_MISSING_RULES)}")


def _report_count(evidence_group: list[Evidence]) -> int:
    return sum(
        evidence.kind == "report" and evidence.state == "positive"
        for evidence in evidence_group
    )


def _same_zone_within_minutes(evidence_group: list[Evidence]) -> float:
    reports_by_zone: dict[str, list[datetime]] = {}
    for evidence in evidence_group:
        if evidence.kind != "report" or evidence.state != "positive":
            continue
        occurred_at = evidence.occurred_at
        if occurred_at.tzinfo is None:
            occurred_at = occurred_at.replace(tzinfo=timezone.utc)
        reports_by_zone.setdefault(evidence.zone_id, []).append(occurred_at)

    shortest_cluster = inf
    for report_times in reports_by_zone.values():
        report_times.sort()
        for start in range(len(report_times) - 2):
            minutes = (report_times[start + 2] - report_times[start]).total_seconds() / 60
            shortest_cluster = min(shortest_cluster, minutes)
    return shortest_cluster


def evaluate(evidence_group: list[Evidence]) -> dict[str, Any]:
    """Evaluate evidence against rules in their declared severity order."""
    facts = {
        "report_count": _report_count(evidence_group),
        "smoke_positive": any(
            evidence.source_type == "smoke_sensor" and evidence.state == "positive"
            for evidence in evidence_group
        ),
        "temperature_abnormal": any(
            evidence.source_type == "temperature_sensor" and evidence.state == "positive"
            for evidence in evidence_group
        ),
        "same_zone_within_minutes": _same_zone_within_minutes(evidence_group),
    }

    for rule_id in SEVERITY_ORDER:
        rule = RULES_BY_ID[rule_id]
        if eval(rule["when"], {"__builtins__": {}}, facts):
            return {
                "rule": rule["id"],
                "status": rule["status"],
                "response": rule["response"],
                "facts": facts,
                "escalate_if": rule["escalate_if"],
                "deescalate_if": rule["deescalate_if"],
            }

    return {
        "rule": None,
        "status": "normal",
        "response": None,
        "facts": facts,
        "escalate_if": "Escalate if any credible report or positive fire sensor evidence is received.",
        "deescalate_if": "Remain normal while no credible evidence indicates a hazard.",
    }
