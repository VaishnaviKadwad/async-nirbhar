# NIRBHAR — Product Requirements Document

**Team:** Team Yallu · **Track:** ASYNC'26 Track 1 — Sovereign AI
**Tagline:** Private intelligence for safer campuses.

## 1. Product Vision

NIRBHAR is a local-first AI decision-support system for campuses and institutions. It receives
human incident reports and simulated sensor signals, correlates related evidence into one
incident, retrieves and cites the governing safety procedure, explains a recommended response,
requires a human officer's approval before anything happens, and keeps a permanent local record.

It is **not** a smoke detector, a camera-surveillance system, a generic chatbot, or an
autonomous emergency-response product. It is the operational brain between detection and action.

**One-line pitch:** Existing systems can detect an incident or send an alert. NIRBHAR is the
private local brain that connects evidence, cites the governing SOP, explains what should
happen next, and keeps a human in control.

## 2. Problem Statement

When a safety incident occurs, the information needed to respond well already exists — but it's
scattered: a student or guard submits a report, sensors may show abnormal conditions, SOPs sit
in unread PDFs, maps and contacts are separate systems, and past incidents are hard to recall.
The officer must manually decide whether signals are related and which procedure applies. This
produces delay, inconsistent response, and loss of institutional knowledge whenever staff change.

## 3. Target Users

| User | Current difficulty | What NIRBHAR provides |
|---|---|---|
| Student / reporter | Unsure where/how to report | Simple structured report with location + category |
| Safety officer | Must inspect scattered reports, device status, PDFs | Unified incident view, evidence timeline, SOP citation, approval workflow |
| Warden / facility team | Receives unclear escalations | Clear, policy-aligned simulated response ticket |
| Administrator | Cannot learn consistently from prior cases | Audit trail, historical incident search, risk heatmap |

## 4. Track Alignment (Data → Knowledge → Memory → Reasoning → Action)

| PS stage | NIRBHAR component |
|---|---|
| Data | Reports (student/guard/warden) + simulated sensor events, normalized into one schema |
| Knowledge | Ingested SOP documents (Campus pack: fire safety + anti-ragging; Factory pack: PPE/heat) |
| Memory | Persistent incident store, append-only audit trail, past-incident history |
| Reasoning | Evidence correlation + retrieval + local LLM explanation, grounded in cited SOP text |
| Action | Human-approved simulated response — nothing executes without a person approving |

PS clause mapping: "privately understand knowledge" → local SOP retrieval. "remember what it
learns" → audit trail + incident memory. "reason across that information" → correlation +
retrieval + LLM explanation. "safely execute useful tasks" → mandatory human approval gate.

## 5. MVP Scope — Must Have

1. Load a Campus Safety policy pack (fire + anti-ragging procedures)
2. Receive student/guard/warden reports and sensor events through one evidence intake API
3. Normalize all evidence into a common schema
4. Correlate reports and sensor events by category, room/zone, and time window
5. Build a structured incident timeline and evidence graph
6. Retrieve relevant SOP sections and cite them exactly
7. Generate an evidence-backed recommendation, uncertainty statement, and "what would change
   my mind" conditions
8. Require an officer decision: approve creates a simulated response ticket; modify requires a
   non-empty reason and also creates a ticket; reject requires a non-empty reason and creates
   no ticket
9. Save every event to a local append-only audit trail
10. Three-room demo scenario: confirmed multi-signal incident, sensor-only incident, normal
    control room (proves the system doesn't hallucinate incidents)

## 6. Stretch Scope — Should Have (only after every Must-have is tested and stable)

1. Evidence graph visualization
2. Risk heatmap from synthetic historical incidents
3. Second policy pack (Factory Safety) with a live swap demo — highest wow factor, but also
   the first item to cut if behind schedule
4. Role-based views (Student / Officer / Administrator)
5. "Has this happened before?" prior-incident search polish
6. One real ESP32 sensor integration (only if everything else is demo-stable)

## 7. Explicitly Out of Scope

Real camera/computer-vision detection · real SMS/WhatsApp/email/call delivery · real IoT as a
default (simulated by design) · mobile app · production login/RBAC · more than two policy
packs · any autonomous action · medical or legal decision support.

## 8. Core User Journey (the rehearsed demo)

1. Student reports "smoke near Block C electrical room"
2. Security guard reports a burning smell in the same zone minutes later
3. Simulated temperature sensor shows a spike in the same zone
4. NIRBHAR correlates the three signals into one incident (INC-DEMO-001), shows the evidence
   graph and plain-language reason for grouping
5. NIRBHAR retrieves and cites the relevant Fire Safety SOP section
6. NIRBHAR proposes: "restrict access, dispatch duty officer, verify alarm status," states
   uncertainty, and states what would escalate/de-escalate the recommendation
7. Officer approves the simulated response
8. Audit log shows the full decision trail
9. Operator asks whether a similar incident happened before; NIRBHAR retrieves a past record
10. (If kept) Switch to the Factory Safety pack and show the same engine applying a different
    procedure to a PPE/heat event

## 9. Acceptance Criteria

- [ ] One-command local setup works from a clean clone
- [ ] Campus policy pack loads correctly; Factory pack loads and swaps (if kept)
- [ ] Student reports and simulated sensors use the same evidence pipeline
- [ ] Room A (confirmed), Room B (sensor-only), Room C (normal) all behave as specified
- [ ] Evidence graph, SOP citation, recommendation, approval, and audit are all visible
- [ ] No recommendation is ever generated without a cited source
- [ ] No simulated action is ever created without a human decision
- [ ] App runs with no dependency on real camera, hardware, or internet
- [ ] Dataset sources and synthetic-data disclosure are present in the repo

## 10. Success Metrics for the Demo

- Full hero scenario (report → correlation → citation → recommendation → approval → audit)
  completes live, start to finish, without manual intervention
- Demo has been run three consecutive times with zero failures before presenting
- A judge can restate the one-line pitch back after hearing it once

## 11. Non-Goals

NIRBHAR does not claim fire-safety certification, does not replace official emergency
procedures, does not provide medical or legal advice, and does not act autonomously under any
circumstance.
