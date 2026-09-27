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
