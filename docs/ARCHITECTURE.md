# NIRBHAR — Architecture

## 1. System Overview

```
┌───────────────────────────┐
│      Officer Dashboard     │
│  timeline · graph · audit  │
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│       FastAPI Backend       │
│   API · validation · auth*  │
└───┬──────────┬──────────┬───┘
    │          │          │
┌───▼───────┐ ┌▼────────┐ ┌▼──────────────┐
│ Evidence  │ │ Policy  │ │ Audit writer   │
│ intake    │ │ pack    │ │ (append-only)  │
└─────┬─────┘ └────┬────┘ └────────────────┘
      │            │
      ▼            ▼
┌──────────────┐ ┌───────────────────────┐
│ Correlation  │ │ Local retrieval / RAG │
│ + rule engine│ │ cited SOP sections    │
└──────┬───────┘ └───────────┬────────────┘
       └───────────┬──────────┘
                    ▼
       ┌────────────────────────────┐
       │  Local LLM / template engine│
       │  grounded explanation only  │
       └──────────────┬───────────────┘
                       ▼
       ┌────────────────────────────┐
       │  SQLite/Postgres + vector DB│
       │  incidents · history · audit│
       └────────────────────────────┘
```

Future only: local camera feed appears in the dashboard as human-verification context — never
as an input to the correlation or reasoning layer.

## 2. Data Flow (Observe → Understand → Reason → Recommend → Act → Learn)

1. **Observe** — evidence intake normalizes reports and sensor events into one schema
2. **Understand** — correlation engine groups related evidence into an incident, builds the
   evidence graph
3. **Reason** — retrieval pulls the relevant SOP section(s); rule engine determines
   deterministic incident status
4. **Recommend** — LLM (or template fallback) produces a grounded explanation: summary,
   status, steps, evidence, uncertainty, mind-change conditions
5. **Act** — officer approves/modifies/rejects; approval creates a simulated response ticket,
   modification with a non-empty reason also creates one, and rejection with a non-empty
   reason creates none
6. **Learn** — every step is written to the append-only audit trail; closed incidents become
   searchable precedent and feed the risk heatmap

## 3. Evidence Schema

```json
{
  "id": "evt-room-a-smoke-001",
  "kind": "report | sensor",
  "category": "fire_hazard",
  "source_type": "student | guard | warden | smoke_sensor | temperature_sensor",
  "zone_id": "block-c-electrical-room",
  "occurred_at": "2026-10-01T09:04:00+05:30",
  "state": "positive | normal | unavailable | contradictory",
  "text": "Smoke near electrical room",
  "value": 68.0,
  "unit": "C",
  "synthetic": true
}
```

All evidence — human report or sensor event — enters through the same schema and the same
intake endpoint. This is deliberate: it's what lets simulated sensors be swapped for real
hardware later with zero change to anything downstream (see DECISIONS.md, ADR-003).

## 4. API Contracts

| Endpoint | Method | Purpose |
|---|---|---|
| `/evidence` | POST | Submit a report or sensor event (same schema for both) |
| `/incidents` | GET | List current incidents with status |
| `/incidents/{id}` | GET | Full incident detail: evidence, graph, citation, recommendation |
| `/incidents/{id}/decision` | POST | `approve` creates a ticket; `modify` requires a non-empty reason and creates a ticket; `reject` requires a non-empty reason and creates none. Returns 404 for unknown incident, 409 if a ticket-creating decision is already recorded, or 422 for a missing required reason. |
| `/audit` | GET | Full append-only audit log |
| `/policy-packs` | GET | List available packs (campus, factory) |
| `/policy-packs/switch` | POST | Swap active policy pack |
| `/incidents/search` | GET | "Has this happened before?" — semantic search over closed incidents |

## 5. Correlation Logic

Evidence is grouped by: active policy pack, category, room/zone, and a 15-minute time window.
Correlation threshold ≥ 0.70 (semantic similarity) combined with location/time match.

```yaml
rules:
  - id: fire-multi-signal
    when: report_count >= 1 and smoke_positive and temperature_abnormal
    status: critical_review
    response: restrict_access_and_dispatch_verification
    escalate_if: confirmed_alarm_or_visible_flame
    deescalate_if: repeat_readings_normal_and_officer_verifies_no_hazard

  - id: sensor-led-fire
    when: smoke_positive and temperature_abnormal and report_count == 0
    status: high_priority
    response: dispatch_verification

  - id: clustered-reports
    when: report_count >= 3 and same_zone_within_minutes <= 15
    status: high_priority
    response: dispatch_verification

  - id: single-credible-signal
    when: smoke_positive or temperature_abnormal or report_count >= 1
    status: attention
    response: verify_with_sop
```

The rule engine determines incident status deterministically. The LLM only explains the
evidence and SOP in clear language — it never overrides a rule-engine decision.

## 6. Retrieval / RAG Pipeline

SOP documents are chunked into sections, embedded with Sentence Transformers, and stored in
FAISS/Chroma/pgvector. Retrieval returns the top-matching section(s) with exact source title
and section ID. If no section clears the relevance threshold, the system returns **"Review
Required"** rather than an invented procedure — this is a hard rule, not a soft preference.

## 7. LLM Reasoning Layer

The LLM (Ollama, local) receives only: the correlated evidence, the retrieved SOP section(s),
and the deterministic status from the rule engine. Its output is constrained to: a plain-
language summary, the cited source, an uncertainty statement, and mind-change conditions. It
never decides incident status and never fabricates a citation.

## 8. Safety / Decision Matrix

| Evidence pattern | Status | Response | Officer responsibility |
|---|---|---|---|
| One report only | Attention | Show SOP + request verification | Review, decide on physical check |
| One sensor signal | Attention | Sensor-led incident, show device health | Verify per SOP |
| 3–4 reports, same zone, ≤15 min | High Priority | Correlate even if sensors normal/offline | Treat as credible, investigate |
| Smoke + temperature positive, no report | High Priority | Sensor-led, grounded guidance | Review, approve simulated response |
| Report + smoke + temperature all positive | Critical Review | High-evidence incident, cited + urgent | Verify, approve/modify/reject |
| Sensor unavailable + report | Attention/High | Device-fault warning shown, report never dismissed | Use report + SOP + verification |
| No report, all sensors normal | Normal | No incident created | No action |

## 9. Failure Modes & Fallbacks

| Failure | Fallback |
|---|---|
| LLM unavailable | Deterministic rule-based template + cited SOP shown instead |
| Sensor unavailable | Replay JSON events or dashboard simulator; shown as "unavailable," never "normal" |
| Camera unavailable | No impact — camera is not in the MVP loop |
| GPU unavailable | Small CPU model or template fallback |
| Network unavailable | All services run on localhost with seeded local data |

## 10. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js / React + TypeScript | Dashboard, graph, heatmap, forms |
| Backend | FastAPI + Pydantic | APIs, validation, orchestration |
| Database | SQLite first, Postgres optional | Reliable local storage |
| Retrieval | Sentence Transformers + FAISS/Chroma/pgvector | SOP search and citation |
| LLM | Ollama (local open-weight model) | Grounded explanation, structured output |
| Rule engine | Python + YAML/JSON pack | Deterministic incident status |
| Graph | React Flow / Cytoscape + graph JSON | Evidence visualization |
| Sensors | Simulator (default) / ESP32 HTTP events (stretch) | Evidence input |
| Deployment | Docker Compose | Reproducible judge setup |
