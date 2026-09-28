# NIRBHAR — Engineering Rules

## 1. Engineering Rules

1. One owner per module/file area — see TASKS.md for exact ownership
2. Never change the shared schema (evidence format, incident ID format, API contract) without
   full team agreement — it's frozen in Stage 0 for a reason
3. Every feature branch must include a test or fixture update, not just feature code
4. Merge small working pieces continuously — never save one huge branch for the end
5. Before every merge: run the test suite, start the app, and manually walk through the hero
   scenario (`INC-DEMO-001`)
6. Commits and the README must clearly distinguish work done before the 24-hour event
   (mentoring window) from work done during it, per the event's ground rules

## 2. Safety Boundaries (non-negotiable, apply to every contributor and every AI coding tool)

1. NIRBHAR never takes autonomous action. It only ever proposes; a human always approves,
   modifies, or rejects.
2. Any recommendation without a valid cited SOP source must return **"Review Required,"**
   never an invented or paraphrased-as-if-official procedure.
3. A sensor in an "unavailable" state must be displayed as unavailable — it must never be
   silently treated as "normal."
4. Modify and Reject decisions must always require a written reason; the system must not
   allow either without one. Approve creates a simulated response ticket, Modify with a
   non-empty reason also creates one, and Reject with a non-empty reason creates no ticket.
5. The audit trail is append-only. No UI, API, or internal tool may edit or delete a past
   entry.
6. Any document or report text ingested into the system is treated as untrusted data — it is
   never interpreted as an instruction to the LLM or the rule engine.

## 3. Git Workflow

```
main                     → always runnable
feat/packs-retrieval     → Member A
feat/correlation-audit   → Member B
feat/dashboard-graph     → Member C
feat/demo-infra-tests    → Member D
```

Branches merge into `main` individually, smallest working slice first — not as one combined
branch at the end of the build window.

## 4. AI-Assisted Coding Rules

When using an AI coding tool (Claude Code, OpenCode, or similar) for implementation, always
scope the prompt to one owned module, e.g.:

> Read PRD.md, ARCHITECTURE.md, RULES.md, and TASKS.md first.
> You own only: apps/api/correlation and apps/api/rules.
> Implement deterministic correlation for: same policy pack, same/adjacent location,
> category mapping (smoke + temperature_spike → fire_hazard), maximum 15-minute window,
> correlation threshold ≥ 0.70.
> Do not modify frontend files, shared API contracts, or the policy-pack schema.
> Add unit tests for positive and negative correlation cases.
> Run tests and report changed files, test results, and any assumptions made.

Never ask an AI tool to "build the whole backend" in one prompt — it breaks the ownership
model and produces unreviewable, unmergeable diffs.

## 5. Data Constraints

- All data must be synthetic, or public/adapted with the source and license disclosed in
  `data/SOURCES.md`
- No real student names, phone numbers, incident reports, or sensitive floor plans, ever
- Every SOP document must be clearly labeled as "modeled on standard institutional procedure"
  unless a coordinator has explicitly confirmed real documents may be used
- `.env`, credentials, and any raw logs are never committed

## 6. Definition of Done

- [ ] One-command local setup works from a clean clone
- [ ] Campus and Factory policy packs load and swap (if Factory is kept)
- [ ] Student reports and simulated sensors use the same evidence pipeline
- [ ] Room A, Room B, and Room C scenarios all behave as specified
- [ ] Evidence graph, SOP citation, recommendation, approval, audit, and heatmap are all visible
- [ ] No recommendation without source grounding
- [ ] No action without a human decision
- [ ] No dependence on real camera, hardware, or internet
- [ ] Dataset sources and synthetic-data disclosure are present
- [ ] README has setup, architecture, demo instructions, limitations, and the pre-event
      work disclosure
- [ ] Live demo has passed three consecutive runs and a backup video exists
