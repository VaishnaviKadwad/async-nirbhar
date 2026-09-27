# NIRBHAR — Test Plan

## 1. Unit Tests

- Correlation logic: positive case — smoke report + guard report + temperature event, same
  zone, within 15 minutes → grouped into one incident
- Correlation logic: negative case — unrelated location or time window → not grouped
- Rule engine: each YAML rule (`fire-multi-signal`, `sensor-led-fire`, `clustered-reports`,
  `single-credible-signal`) fires on its exact trigger condition and not otherwise
- Retrieval: query matching `CAMPUS-FIRE-3.2` returns the correct section and excerpt
- Retrieval: query with no relevant SOP match returns "Review Required," never a fabricated
  citation

## 2. API Tests

- `POST /evidence` accepts valid report and sensor payloads; rejects malformed ones
- `GET /incidents` and `GET /incidents/{id}` return correct evidence, correlation reason, and
  citation for the hero scenario
- `POST /incidents/{id}/decision` requires a reason on modify/reject; rejects a decision
  payload missing one
- `POST /incidents/{id}/decision` with `approve` creates exactly one simulated response
  ticket; with `modify`/`reject`, creates none
- `GET /audit` returns every prior event in order, and the entries persist after a restart
- `POST /policy-packs/switch` correctly changes which SOP corpus and rule set are active (if
  Factory pack is kept)

## 3. UI Tests

- Dashboard renders all three rooms (A/B/C) with correct status coloring
- Incident Detail view renders the evidence timeline, graph, citation, recommendation,
  mind-change panel, and approval controls without errors
- Approve/Modify/Reject buttons correctly enable/disable based on whether a reason has been
  entered
- Audit Log view renders the full decision trail for the hero scenario
- Heatmap displays the "Historical synthetic incident density — not predictive risk" label

## 4. End-to-End Tests

- Full hero scenario (report → guard report → sensor spike → correlation → citation →
  recommendation → approval → audit) completes without manual intervention
- Room B (sensor-only, no report) produces a correctly-labeled sensor-led incident
- Room C (no report, all sensors normal) produces no incident at all

## 5. Offline / Failure Tests

- LLM disabled → deterministic rule-based template + cited SOP is shown; no crash
- Sensor marked unavailable → shown as "unavailable" in the UI, never silently treated as
  "normal"
- No valid SOP source for a query → "Review Required" shown, never an invented procedure
- App restarted mid-incident → audit trail and incident state persist correctly, in order
- GPU unavailable → falls back to CPU-only model or template without breaking the pipeline
- Network unavailable → app still runs fully on localhost with seeded data

## 6. Demo-Readiness Gate

The team must run the complete demo script successfully **three consecutive times** with no
manual fixes between runs. Only after this gate is passed may the team stop adding features —
from that point on, only bug fixes are allowed.

**Backup plan if something fails live:**
- Sensor/ESP32 failure → fall back to the one-click JSON replay simulator
- LLM failure → fall back to the deterministic SOP template
- Full live-demo failure → fall back to the pre-recorded walkthrough video
- Graph component failure → fall back to static screenshots of the evidence graph
