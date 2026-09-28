# NIRBHAR — Architecture Decision Records

## ADR-001: Local-first deployment

**Context:** The track explicitly asks for systems individuals/organizations can run without
handing data to a third party.
**Decision:** Every component (embeddings, retrieval, LLM via Ollama, database, audit log)
runs on infrastructure the team/institution controls. No SOP text, report, or decision is ever
sent to an external API.
**Consequences:** Slightly more setup complexity than calling a hosted LLM API, but it's the
entire reason the project is "Sovereign AI" rather than "an AI feature." Non-negotiable.

## ADR-002: Deterministic rule engine + LLM explanation, kept separate

**Context:** An LLM alone deciding "is this an emergency" is both unreliable and hard to
defend to judges asking "what if the model hallucinates."
**Decision:** A YAML-configured rule engine makes the actual incident-status decision
deterministically. The LLM only explains the evidence and cites the SOP in plain language — it
cannot override the rule engine's status.
**Consequences:** Safer, more explainable, and answers the single most likely judge objection
before it's asked. Slightly less "AI-native" sounding, but far more defensible.

## ADR-003: Simulated sensors by default; real hardware only as a late-stage stretch

**Context:** Real IoT integration adds a hardware-failure risk with no benefit to the actual
innovation (the reasoning layer), and the team is not confident in early hardware reliability.
**Decision:** All sensor evidence enters through the same `/evidence` API and schema, whether
from a simulator script or a real device. Simulated by default; a real ESP32 is only added
after the full Core loop and kept Stretch features have passed three consecutive clean demo
runs.
**Consequences:** The intelligence layer — the actual point of the project — can be fully
built and tested with zero hardware dependency. If hardware is added late, nothing downstream
needs to change, because the contract was designed for this from day one.

## ADR-004: Synthetic data only, clearly disclosed

**Context:** Real incident reports and real student data are exactly the kind of sensitive
information this project shouldn't handle casually, and SOP documents claimed as "official"
without permission are a credibility risk.
**Decision:** All incident reports, sensor events, and historical incidents are fictional. SOP
documents are modeled on standard institutional procedure structure, not claimed as any real
institution's actual official documents unless explicitly confirmed. Every source is disclosed
in `data/SOURCES.md`.
**Consequences:** Removes an entire category of risk (privacy, misrepresentation) at zero cost
to the demo's credibility, since correctness of the demo doesn't depend on the data being real.

## ADR-005: Two policy packs, with Factory kept as the first item to cut

**Context:** A live policy-pack swap is the single strongest proof that the engine is a
platform, not a hardcoded campus tool — but it doubles the SOP corpus and rule-set work.
**Decision:** Build the Factory pack as a Should-have, not a Must-have. If the team is behind
schedule at the Stage 3 checkpoint, cut it first and keep the promise as a "future work"
slide instead of a live demo.
**Consequences:** Protects the Core loop (30% of the score) from being put at risk for the
sake of a 20%-weighted Innovation feature.

## ADR-006: Human approval gate is mandatory, not configurable

**Context:** The PS explicitly uses the word "safely" for the Action stage, and judges are
primed to be skeptical of anything that looks autonomous.
**Decision:** There is no code path, setting, or "auto-approve" mode anywhere in the system
that allows a simulated response ticket to be created without an explicit human decision.
**Consequences:** This is the single most load-bearing safety property of the whole project —
it is treated as untouchable, not as a feature that could be simplified under time pressure.

## ADR-007: SQLite before Postgres

**Context:** The team needs a database that works with zero setup friction on demo day,
potentially on unfamiliar venue hardware/network.
**Decision:** SQLite is the default; Postgres + pgvector remains available as an optional
upgrade path but is not required for the demo to work.
**Consequences:** One less thing that can fail on unfamiliar venue infrastructure. Vector
search still works via FAISS/Chroma without a running Postgres instance.
# NIRBHAR — Decisions Log

Record of deliberate engineering tradeoffs made during the hackathon build, so the
reasoning survives past the moment it was made — for the team, the writeup, and
for answering judge questions honestly rather than improvising.

---

## D-001: Incident IDs are deterministic, not stable across evidence changes

**Date:** ASYNC'26 build
**Owners involved:** B1 (evidence intake & correlation), B2 (API surface & decisions)
**Status:** Accepted — mitigated and documented, not fixed

### Context
An `Incident`'s `id` is derived deterministically from a hash of `zone_id` +
the sorted set of evidence item ids that make up that incident
(`apps/api/correlation/query.py`). This fixes an earlier bug where `correlate()`
assigned a fresh random UUID on every call, which meant `list_incidents()` and
`get_incident()` could never agree on an id for the same underlying incident.

The fix is correct for that bug, but introduces a related, narrower edge case:
if **new evidence arrives for the same zone** between (a) an officer calling
`GET /incidents/{id}` to review an incident, and (b) that officer submitting
`POST /incidents/{id}/decision`, the incident's evidence set has changed —
so its id has also changed. The `id` the officer is deciding against no longer
resolves to anything.

### Options considered

**Option A — Accept the 404 collapse.**
The decision endpoint's existing lookup already handles this: an id that never
existed and an id that existed-but-changed both return 404. No new code.
From the officer's point of view, the correct action is identical in both
cases — refresh and re-fetch the current incident list.

**Option B — Add a version/fingerprint field.**
`GET /incidents/{id}` would return an `evidence_fingerprint` field (the same
hash already computed internally for the id). The decision POST would include
that fingerprint back; the server would distinguish "never existed" (404) from
"existed but changed since you viewed it" (409) by recomputing and comparing
the fingerprint. This is a real fix, but requires a three-way contract change
across B1 (expose the field), B2 (accept + compare it, return 409), and
Member C / frontend (store the fingerprint from the GET, send it back on
decision, handle the new 409 case in the UI). If the frontend doesn't
implement its half, the field does nothing — added complexity with no
actual protection.

### Decision
**Option A.** The 404 collapse is accepted as-is. The gap only matters in a
narrow timing window (new evidence landing on an already-viewed, not-yet-decided
incident), the failure mode is safe (no wrong data is ever acted on — the
officer simply can't submit against a stale id), and Option B's real fix is a
joint contract change that isn't justified given the timeline and the size of
the gap it closes.

### How to describe this if asked (writeup / demo Q&A)
> "Incident ids are deterministic hashes of their evidence set, which means a
> decision made against a stale id fails safely (404) rather than silently
> succeeding against outdated data. We considered a fingerprint/versioning
> scheme to distinguish 'never existed' from 'changed since you viewed it,'
> but scoped it out as a three-way contract change beyond this hackathon's
> timeline — the current behavior is a deliberate, documented tradeoff, not
> an oversight."

Do not describe this as "solved." It is mitigated and documented.
