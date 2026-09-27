# NIRBHAR — Project Memory (read this first, every time)

This is the single fastest way for any team member — or any AI coding tool — to get full
context on the project without reading every other file first.

## Pitch Language

**One-line pitch:** Existing systems can detect an incident or send an alert. NIRBHAR is the
private local brain that connects evidence, cites the governing SOP, explains what should
happen next, and keeps a human in control.

**Tagline:** Private intelligence for safer campuses.

**Opening line for the live demo (20 seconds):**
> "A campus already has reports, procedures, maps, and sometimes sensors. The problem is they
> remain disconnected during the moment that matters. NIRBHAR is a local-first safety brain
> that connects evidence to the correct SOP and keeps the officer in control."

**Closing line (15 seconds):**
> "NIRBHAR does not replace responders. It gives them evidence, procedure, memory, and
> accountability — locally, privately, and when time matters."

## Track 1 PS Alignment — memorize this table

| PS stage | NIRBHAR component |
|---|---|
| Data | Reports + simulated sensor events |
| Knowledge | Ingested SOP policy packs |
| Memory | Persistent incident store + audit trail |
| Reasoning | Correlation + retrieval + LLM explanation |
| Action | Human-approved simulated response only |

PS clause → component: "privately understand knowledge" = local retrieval · "remember what it
learns" = audit trail · "reason across that information" = correlation + retrieval + LLM ·
"safely execute useful tasks" = mandatory approval gate.

## Judging Criteria → What Earns It

| Criterion | Weight | Earned by |
|---|---|---|
| Technical Execution | 30% | Full working loop, rule engine + LLM split, correlation logic |
| Innovation | 20% | Evidence graph, "what would change my mind," policy-pack swap |
| Impact | 20% | Real campus safety stakes, extensibility to other domains |
| Product Experience | 15% | Dashboard, timeline, graph, approval UI |
| Demo & Completeness | 15% | Three-room scenario, rehearsed script, fallback reliability |

## Non-Negotiable Demo Elements (never cut these under any time pressure)

1. The correlation of independent evidence into one incident
2. The exact SOP citation (title + section ID + excerpt)
3. The human approval gate — approve/modify/reject
4. The audit log showing the full decision trail

## Scope Traps to Avoid

- Do **not** start with dashboard polish, camera integration, or hardware before the core
  incident-to-audit loop works end to end
- Do **not** let the Factory policy pack put the Campus pack's reliability at risk — it's the
  first thing to cut
- Do **not** add a feature after the three-consecutive-clean-runs gate has been passed — bug
  fixes only from that point on
- Do **not** ask an AI coding tool to "build the whole backend" in one prompt — scope every
  prompt to one owned module (see RULES.md §4)

## Judge Q&A Cheat Sheet

**"Why collect reports if sensors can detect smoke?"**
Sensors are continuous but limited by placement, health, and coverage. People notice things
sensors can't — smell, blocked exits, hazards outside sensor range. NIRBHAR treats human
reports and devices as independent evidence, not duplicates.

**"Do all signals need to be positive before action?"**
No. Any credible signal creates an officer-review incident; multiple independent signals
increase urgency. NIRBHAR never autonomously acts — the officer verifies and decides.

**"Why use an LLM if rules are enough?"**
Rules decide deterministic incident status and safety boundaries. The LLM makes SOP-grounded
evidence understandable — summarizes, cites, explains uncertainty. It cannot override the
rules.

**"Why is this Sovereign AI?"**
The knowledge base, incident records, retrieval, reasoning, audit log, and model all run
locally. Sensitive location and incident context never goes to a third-party cloud.

**"Why no camera in the MVP?"**
Deliberate scope control, not a missing idea — the core decision-support loop is the value.
Camera is a future local verification panel for the officer, not a replacement for evidence
correlation, SOP grounding, human approval, and auditability.

**"How is this different from an SOS app or a dashboard?"**
An SOS app records one alert. A dashboard displays data. NIRBHAR correlates evidence, finds
the governing procedure, explains the recommendation and its uncertainty, requires approval,
and retains organizational memory.

## Demo Sequence (memorize the order)

Report → guard report → sensor spike → correlation into `INC-DEMO-001` → evidence graph → SOP
citation → recommendation + mind-change conditions → officer approval → audit log → "has this
happened before" recall → (if kept) policy-pack swap to Factory.
