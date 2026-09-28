# NIRBHAR B1 Handoff: Evidence Intake & Correlation Engine

## 1. Implementation by File

- `apps/api/models/evidence.py` — Defines `Evidence(BaseModel)`, the Pydantic evidence contract described below.
- `apps/api/storage/evidence_store.py` — Defines the local SQLite `engine`, `evidence_table`, and `store_evidence(evidence: Evidence) -> Evidence`.
- `apps/api/storage/evidence.sqlite3` — Local SQLite runtime database containing the `evidence` table; this is persisted data, not source code.
- `apps/api/rules/rules.yaml` — Declares four named rules with conditions, statuses, responses, and escalation/de-escalation descriptions.
- `apps/api/rules/engine.py` — Defines `SEVERITY_ORDER` and `evaluate(evidence_group: list[Evidence]) -> dict[str, Any]`; loads rules at import and computes facts before selecting a result.
- `apps/api/rules/test_engine.py` — Eight pytest tests for rule matches, the normal fallback, sensor-led single-sensor branches, and rule-order independence.
- `apps/api/correlation/correlate.py` — Defines `Incident(BaseModel)` and `correlate(all_evidence: list[Evidence]) -> list[Incident]`.
- `apps/api/correlation/query.py` — Defines `list_incidents() -> list[Incident]` and `get_incident(id: str) -> Incident | None`; reads stored evidence and rebuilds current incidents on each call.
- `apps/api/correlation/test_correlate.py` — Two pytest tests for the three-item hero grouping and separation by zone.
- `apps/api/correlation/test_multi_room.py` — One pytest test for three rooms processed together and their expected incident statuses.
- `apps/api/correlation/test_query.py` — Three pytest tests for listing and looking up incidents backed by temporary SQLite storage.
- `apps/api/routes/evidence.py` — Defines an `APIRouter` with `create_evidence(payload: dict[str, Any] = Body(...)) -> Evidence` at `POST /evidence`; validates with `Evidence`, stores the record, then calls the audit stub.

Generated `__pycache__` bytecode files are interpreter artifacts and are not maintained implementation files.

## 2. Evidence Schema

`Evidence` has these fields:

| Field | Type | Restriction / default |
| --- | --- | --- |
| `id` | `str` | Free string |
| `kind` | `Literal["report", "sensor"]` | Literal-restricted enum |
| `category` | `str` | Free string |
| `source_type` | `Literal["student", "guard", "warden", "smoke_sensor", "temperature_sensor"]` | Literal-restricted enum |
| `zone_id` | `str` | Free string |
| `occurred_at` | `datetime` | Pydantic datetime; parseable timestamp strings are converted during validation, and invalid timestamp strings become request validation errors (HTTP 422) at the evidence API boundary |
| `state` | `Literal["positive", "normal", "unavailable", "contradictory"]` | Literal-restricted enum |
| `text` | `Optional[str]` | Optional free text; defaults to `None` |
| `value` | `Optional[float]` | Optional number; defaults to `None` |
| `unit` | `Optional[str]` | Optional free string; defaults to `None` |
| `synthetic` | `bool` | Defaults to `True` |

Only `kind`, `source_type`, and `state` are Literal-restricted enums. `id`, `category`, and `zone_id` are free strings; `text` and `unit` are optional free strings. `occurred_at` is a `datetime`, not a string field.

## 3. Rule Engine Behavior

The engine evaluates rules in this fixed severity order; the normal result is the fallback after all four fail:

| Order | Rule | Exact trigger | Status | Response |
| --- | --- | --- | --- | --- |
| 1 | `fire-multi-signal` | `report_count >= 1 and smoke_positive and temperature_abnormal` | `critical_review` | `restrict_access_and_dispatch_verification` |
| 2 | `sensor-led-fire` | `(smoke_positive or temperature_abnormal) and report_count == 0` | `high_priority` | `dispatch_verification` |
| 3 | `clustered-reports` | `report_count >= 3 and same_zone_within_minutes <= 15` | `high_priority` | `dispatch_verification` |
| 4 | `single-credible-signal` | `smoke_positive or temperature_abnormal or report_count >= 1` | `attention` | `verify_with_sop` |
| Fallback | No matching rule | None of the four conditions match | `normal` | `None` in `evaluate()`; converted to `no_action` when building an `Incident` |

The engine loads `rules.yaml` into `RULES_BY_ID`, verifies at module import that all IDs in `SEVERITY_ORDER` exist, and then iterates `SEVERITY_ORDER` explicitly. YAML or dictionary insertion order therefore does not select the winner. A missing required rule raises `ValueError` during import.

The `sensor-led-fire` condition is the OR form: with zero positive reports, a positive smoke sensor alone or a positive temperature sensor alone matches; both sensors are not required. Dedicated tests cover smoke-only and temperature-only inputs, as well as the existing combined-sensor case.

`report_count` counts positive `kind == "report"` items. `smoke_positive` and `temperature_abnormal` are derived from positive evidence with the corresponding sensor `source_type`. `same_zone_within_minutes` is the smallest time span covering any three positive reports in one zone; it is infinity if no such triple is available.

## 4. Correlation Logic

`correlate()` sorts evidence by `occurred_at`, normalizes aware datetimes to UTC, and attaches UTC to naive datetimes. It groups items only within the same `zone_id`. A candidate must be no more than 15 minutes after the group’s earliest item, so each resulting group spans at most 15 minutes. Groups are built greedily in timestamp order. Pydantic validates `occurred_at` as a datetime before the API route passes evidence to correlation.

The report-to-report placeholder returns `0.85` when both text strings contain non-whitespace characters and `0.0` otherwise, against a threshold of `0.70`. The comparison applies to report evidence with text; missing report text and sensor evidence skip the text comparison. Thus sensor-only evidence without text groups on zone and time. Member A is expected to replace this placeholder with real Sentence Transformers embeddings.

For each group, `_make_incident()` calls `evaluate(group)` and constructs an `Incident` with `id`, `zone_id`, `evidence`, `correlation_reason`, `status`, `response`, `escalate_if`, and `deescalate_if`. The reason states the item count, zone, time span, and that report similarity met the threshold where applicable. The direct correlation ID starts as a random UUID4. If the rule engine returns no response, the `Incident` response is `no_action`.

## 5. Incident ID Derivation

`correlate()` initially makes a fresh UUID4 for each `Incident`. The query layer replaces it with a deterministic UUID5 derived from the incident’s `zone_id` and sorted evidence IDs, encoded as a compact JSON name under the URL namespace. This allows `list_incidents()` and a later `get_incident(id)` call to agree when the evidence set has not changed.

If new evidence changes the incident’s evidence set, its derived ID changes. Decision D-001 in `docs/DECISIONS.md` records this as accepted and documented, not fixed: a stale ID safely fails lookup and the caller must refresh the incident list.

## 6. Query Functions for B2

- `list_incidents() -> list[Incident]` — Returns the full current incident list, with each item shaped as `{id, zone_id, evidence, correlation_reason, status, response, escalate_if, deescalate_if}`.
- `get_incident(id: str) -> Incident | None` — Returns the current incident with the matching ID, or `None` if no current incident matches; the returned shape is the same.

Both functions call the shared query helper, which selects all rows from `evidence_store.py`’s SQLite `evidence_table`, reconstructs `Evidence` objects, calls `correlate()`, and derives stable query IDs. This happens on every call; incidents are not cached. If the SQLite path does not exist, the helper returns an empty list.

## 7. Tests and Verification

| Test file | Tests | What they prove |
| --- | ---: | --- |
| `apps/api/rules/test_engine.py` | 8 | Checks each rule with a matching scenario, smoke-only and temperature-only sensor-led triggers, the `normal` fallback, and that reversing `RULES_BY_ID` insertion order still selects `fire-multi-signal` when multiple conditions match. |
| `apps/api/correlation/test_correlate.py` | 2 | Checks that the three-item report/smoke/temperature hero group produces one critical incident and that evidence in different zones stays separate. |
| `apps/api/correlation/test_multi_room.py` | 1 | Processes Rooms A, B, and C together; checks three separate incidents, four evidence items in Room A, and critical/high-priority/attention statuses respectively. |
| `apps/api/correlation/test_query.py` | 3 | Uses temporary SQLite storage to check that stored evidence yields an incident, an ID from `list_incidents()` resolves through `get_incident()`, and a made-up ID returns `None`. |

Full pytest suite: **14 passed** (`14 passed in 0.89s`). The repository’s `pytest.ini` sets `pythonpath = .`.

## 8. Merge Instructions

In B2’s `apps/api/routes/incidents.py`, replace the mock `Incident` import with:

```python
from apps.api.correlation.query import list_incidents, get_incident
```

In `apps/api/routes/evidence.py`, replace the audit stub import with:

```python
from apps.api.audit.audit_log import append_event
```

At handoff time, `apps/api/routes/incidents.py` and `apps/api/audit/audit_log.py` are not present in this checkout; the evidence route currently imports `apps.api.audit.audit_log_stub.append_event`. Apply these swaps when the corresponding B2 and real audit modules are integrated.
