# NIRBHAR — Tasks (4-Member Ownership Split)

## Shared Contract (frozen before anyone starts solo work)

```
Policy pack:     campus-safety-v1
Hero incident:   INC-DEMO-001
Hero room:       block-c-electrical-room
Primary SOP:     CAMPUS-FIRE-3.2
Demo operator:   officer-demo
```

**Non-negotiable rule:** all four members build against this fixture and the evidence schema
in ARCHITECTURE.md §3 before writing any feature code. Nobody waits on anybody else's real
code — everyone mocks whatever they don't own yet, using this exact shared shape.

---

## Member A — RAG / Policy Pack Engineer

**Owns:** `data/policy_packs/`, SOP ingestion, retrieval, citations

**Solo phase (build alone, against the fixture):**
1. Write the Campus policy pack: 10–20 SOP sections covering fire safety and anti-ragging
   procedures, each with a stable section ID (e.g. `CAMPUS-FIRE-3.2`)
2. Write the Factory policy pack (if kept): 8–12 sections covering PPE/heat procedures
3. Build document ingestion: chunk SOP text into sections with metadata (title, section ID,
   pack name)
4. Build the embedding + retrieval pipeline (Sentence Transformers + FAISS/Chroma/pgvector)
5. Test retrieval against the fixture: querying for "smoke near electrical room" must return
   `CAMPUS-FIRE-3.2` with the exact excerpt
6. Implement the "no match above threshold → Review Required" fallback
7. Write `data/SOURCES.md` disclosing every source/license and confirming all content is
   synthetic or adapted-public

**Merge phase (after Stage 2 checkpoint):**
- Wire real retrieval into the live pipeline in place of Member B's mock SOP source
- Own the policy-pack switch endpoint and its UI hook (if Factory pack is kept)
- Support Member B in tuning the relevance threshold using real retrieval results

**Must deliver:** working Campus (and optionally Factory) packs, exact-citation retrieval,
pack switching, `data/SOURCES.md`

---

## Member B — Intelligence / Backend Engineer

**Owns:** evidence API, rule engine, correlation, recommendation, audit

**Solo phase (build alone, against the fixture, using a mock SOP source):**
1. Build the `/evidence` intake endpoint accepting the schema in ARCHITECTURE.md §3
2. Build the deterministic rule engine from ARCHITECTURE.md §5 (YAML rules, thresholds)
3. Build correlation logic: group evidence by pack, category, zone, and 15-minute window;
   generate the plain-language grouping reason
4. Build the `/incidents` and `/incidents/{id}` endpoints, returning evidence, correlation
   reason, and (mocked) SOP citation
5. Build the LLM reasoning layer (Ollama call, constrained to summary + citation echo +
   uncertainty + mind-change conditions) with a deterministic template fallback if the LLM is
   unavailable
6. Build the `/incidents/{id}/decision` endpoint: approve/modify/reject, reason required on
   modify/reject, only approve creates a simulated response ticket
7. Build the append-only audit writer and the `/audit` endpoint
8. Write unit tests: positive correlation (Room A hero scenario), negative correlation
   (unrelated location/time), rule-engine status transitions

**Merge phase (after Stage 2 checkpoint):**
- Swap the mock SOP source for Member A's real retrieval output
- Support Member C in shaping API responses to match the dashboard's needs
- Own the `/incidents/search` ("has this happened before") endpoint as a stretch item

**Must deliver:** full evidence-to-audit pipeline working end-to-end on the hero scenario,
with tested fallbacks for LLM-unavailable and no-SOP-match cases

---

## Member C — Frontend / Product Engineer

**Owns:** dashboard, forms, evidence graph, approval UI, heatmap

**Solo phase (build alone, against mocked API responses matching the frozen schema):**
1. Build the Command Center dashboard: three room cards (Block C, Lab 2, Classroom 3) with
   status coloring per DESIGN.md §3
2. Build the report submission form (type, description, location, timestamp)
3. Build the Incident Detail view: evidence timeline, SOP citation panel, recommendation
   panel, "what would change my mind" panel, approval controls (approve/modify/reject with
   required reason on modify/reject)
4. Build the Audit Log view
5. Stub the evidence graph and heatmap views against mocked data first

**Merge phase (after Stage 2 checkpoint):**
- Swap every mocked API call for Member B's real backend
- Build the real evidence graph (React Flow/Cytoscape) once Core UI is stable and wired
- Build the real heatmap, clearly labeled "Historical synthetic incident density — not
  predictive risk"
- Build the policy-pack switcher UI (if kept)

**Must deliver:** a projector-ready dashboard covering the full DESIGN.md screen list, wired
to real data by the end of Stage 2

---

## Member D — Integration / QA / Demo Engineer

**Owns:** Docker, seed data, simulation, tests, README, demo script

**Solo phase (build alone, in parallel with A/B/C):**
1. Set up the repository structure, `.gitignore`, license, and Docker Compose skeleton
2. Write the shared fixture JSON (the hero scenario) that A, B, and C all test against
3. Write all synthetic seed data: 10–15 incident reports, 4–6 simulated sensor events, 6–10
   closed historical incidents, the zone/map JSON
4. Build the sensor simulator (manual-trigger + timed-replay modes) that posts to `/evidence`
   in the same schema real hardware would use
5. Draft the README skeleton and the demo script structure
6. Draft the end-to-end test plan (see TEST_PLAN.md)

**Merge phase (owns every merge from Stage 2 onward):**
- Runs the test suite and a full manual walkthrough before every merge lands on `main`
- Owns the three-consecutive-clean-runs readiness gate
- Records the backup walkthrough video
- Finalizes the README (setup, architecture, demo, limitations, pre-event work disclosure)
- Packages the final GitHub submission (public repo, open-source license, all disclosures)

**Must deliver:** one-command setup that works from a clean clone, a demo that has passed
three consecutive runs, a backup video, and a submission-ready repository

---

## Merge Sequence (Stage 2 checkpoint)

1. Member D merges the fixture + Docker skeleton first — everyone else's mocks are validated
   against it
2. Member A merges retrieval — tested in isolation against the fixture query
3. Member B merges the evidence/correlation/recommendation/audit pipeline, swapping in A's
   real retrieval
4. Member C merges the frontend, swapping mocked calls for B's real API
5. After each merge: run tests, start the app, walk through the hero scenario before moving
   to the next merge

## Build Order — never reverse this

Seeded scenario → correlation → SOP citation → recommendation → approval → audit → dashboard
polish → graph + heatmap → optional second policy pack → optional hardware.

## Exact Hero Demo Scenario (shared reference for all four members)

1. Student report: "Smoke near Block C electrical room" (09:00)
2. Security guard report: burning smell, same zone (09:04)
3. Simulated temperature sensor spike, same zone (09:06)
4. NIRBHAR groups all three into `INC-DEMO-001`, shows the evidence graph
5. NIRBHAR retrieves and cites `CAMPUS-FIRE-3.2`
6. NIRBHAR recommends: restrict access, dispatch duty officer, verify alarm status — with
   escalate/de-escalate conditions stated
7. Officer (`officer-demo`) approves the simulated response
8. Audit log shows the complete decision trail
9. Operator asks "has this happened before?" — NIRBHAR retrieves a past record
10. (If kept) Switch to Factory pack, show a PPE/heat event handled by the same engine
