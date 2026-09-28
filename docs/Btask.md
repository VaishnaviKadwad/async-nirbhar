Splitting Member B into two makes sense — it was our highest-complexity module. The natural fracture line is: **one person owns getting evidence in and deciding what's happening (deterministic)**, the **other owns explaining it, deciding what to do about it, and remembering it (LLM \+ human-facing)**. This split lets both of you work almost entirely in parallel, because there's exactly one clean handoff point between you.

### **The one contract you must freeze together before either of you starts solo work (10 minutes, not longer)**

Sit together and agree on this exact shape — nothing else needs joint discussion until merge:

Incident {  
  id: string  
  zone\_id: string  
  evidence: \[Evidence\]              \# from the evidence schema  
  correlation\_reason: string        \# plain-language grouping reason  
  status: "normal" | "attention" | "high\_priority" | "critical\_review"  
  response: string                  \# e.g. "restrict\_access\_and\_dispatch\_verification"  
  escalate\_if: string  
  deescalate\_if: string  
}

append\_event(event\_type: string, payload: dict) \-\> None   \# audit function signature

B1 produces `Incident` objects. B2 consumes them. Both of you call `append_event()`. Once this is written down, you don't need to talk to each other again until Step 9\.

---

## **B1 — Evidence Intake & Correlation Engine**

**What you own:** getting evidence into the system correctly, and deterministically deciding what's happening. Nothing you build depends on B2's work at all — you can go start to finish without waiting on them.

### **gstack skills for your track**

`/freeze` at the very start, `/plan-eng-review` before each major step, `/review` before merging, `/investigate` if correlation misbehaves. Skip `/qa` — that's for testing user-facing flows through a browser, and your module has no UI surface of its own.

### **Step 0 — Environment \+ freeze scope**

bash  
mkdir \-p apps/api && cd apps/api  
python \-m venv venv && source venv/bin/activate  
pip install fastapi uvicorn pydantic sqlalchemy pyyaml sentence-transformers pytest  
/freeze apps/api/models/ apps/api/routes/evidence.py apps/api/storage/evidence\_store.py apps/api/rules/ apps/api/correlation/

**Why freeze first:** this stops any AI coding tool from accidentally touching B2's files while implementing yours — the single biggest cause of painful merge conflicts on a 2-person split like this.

### **Step 1 — Evidence schema**

/plan-eng-review  
Building the evidence intake side of NIRBHAR's backend. Lock the Pydantic model for  
apps/api/models/evidence.py: id, kind (report|sensor), category, source\_type  
(student|guard|warden|smoke\_sensor|temperature\_sensor), zone\_id, occurred\_at (ISO 8601),  
state (positive|normal|unavailable|contradictory), text (optional), value (optional  
float), unit (optional), synthetic (bool, default true). Use Literal types for the enums.

**Verify:** instantiate the model with one valid and one invalid payload in a Python shell; confirm the invalid one raises immediately.

### **Step 2 — `POST /evidence`**

Create POST /evidence in apps/api/routes/evidence.py: validates against the Evidence  
model, assigns a server-generated id if missing, stores via store\_evidence() in  
apps/api/storage/evidence\_store.py (SQLite/SQLAlchemy), returns 201\. Reject malformed  
payloads with 422\. After storing, call append\_event("evidence\_received", evidence.dict())  
— assume this function exists at apps/api/audit/audit\_log.py even though you haven't  
built it; your teammate owns it and will provide the real implementation at merge. For  
now, stub it as a no-op function in a local file so your code runs standalone.

**Verify:** POST the three hero-scenario evidence items via `/docs`, confirm they're stored and queryable.

### **Step 3 — Rule engine**

/plan-eng-review  
Lock the deterministic status logic. Create apps/api/rules/rules.yaml with four rules:  
1\. fire-multi-signal: report\_count\>=1 and smoke\_positive and temperature\_abnormal  
   → status critical\_review, response restrict\_access\_and\_dispatch\_verification  
2\. sensor-led-fire: smoke\_positive and temperature\_abnormal and report\_count==0  
   → status high\_priority, response dispatch\_verification  
3\. clustered-reports: report\_count\>=3 and same\_zone\_within\_minutes\<=15  
   → status high\_priority, response dispatch\_verification  
4\. single-credible-signal: smoke\_positive or temperature\_abnormal or report\_count\>=1  
   → status attention, response verify\_with\_sop  
Create apps/api/rules/engine.py with evaluate(evidence\_group) computing the boolean  
facts and returning the FIRST matching rule (checked most-severe first, so a mild  
pattern can't short-circuit a more severe one), or status "normal" if none match.  
Include escalate\_if/deescalate\_if strings in the output. Write unit tests for each rule  
and the no-match case.

**Verify by hand, not just tests:** before running anything, decide on paper what status *you* expect for the hero scenario, then confirm the engine agrees. This is the step most likely to have a subtle ordering bug — read the generated code, don't just trust green tests.

/review  
Check apps/api/rules/ — confirm rules are evaluated most-severe-first, not in  
arbitrary/definition order.

### **Step 4 — Correlation logic**

/plan-eng-review  
Create apps/api/correlation/correlate.py: correlate(all\_evidence) groups Evidence by  
zone\_id, within a 15-minute window, with text similarity \>=0.70 (use a placeholder  
mock embedder for now — Member A will provide the real Sentence Transformers pipeline  
later). Sensor-only evidence with no text matches on zone+time alone. Output Incident  
objects per the frozen contract, combining the correlation\_reason with rule engine  
output from Step 3\. Write tests: hero scenario's 3 items must group into one incident;  
items in different zones must not.

**Verify — spend real time here, this is your hardest step:** run correlation against ALL your fixture data at once (Room A, B, and C together), not the hero scenario in isolation. A threshold that looks right on one scenario can silently break another.

/investigate  
\[if correlation groups things incorrectly\] — trace root cause in the similarity  
threshold or the time window logic before adjusting anything.

### **Step 5 — Expose internal functions for B2 to call**

Create apps/api/correlation/query.py with two plain Python functions (not HTTP routes):  
list\_incidents() \-\> list\[Incident\] and get\_incident(id) \-\> Incident | None. These are  
what your teammate's API layer will call. Write a short docstring documenting the exact  
Incident shape returned.  
/ship

**You're done with Core.** Tell B2 you're ready for merge once this passes.

---

## **B2 — Reasoning, API Surface, Decisions & Audit**

**What you own:** explaining incidents, exposing them over HTTP, handling human decisions, and remembering everything. You build entirely against a **mocked** `Incident` object matching the frozen contract until B1 merges — you never wait on them.

### **gstack skills for your track**

`/freeze`, `/plan-eng-review`, `/review`, `/qa` (this time genuinely useful — your endpoints are what B2/frontend will hit), `/investigate` if the LLM path misbehaves.

### **Step 0 — Environment \+ freeze scope**

bash  
cd apps/api  \# same repo, same venv as B1  
pip install ollama  
/freeze apps/api/routes/incidents.py apps/api/reasoning/ apps/api/routes/decisions.py apps/api/audit/

### **Step 1 — Mock the Incident contract**

Create tests/fixtures/mock\_incident.py returning a hardcoded Incident object matching  
this exact shape: {id, zone\_id, evidence: \[...\], correlation\_reason, status  
(normal|attention|high\_priority|critical\_review), response, escalate\_if, deescalate\_if}.  
Populate it with the hero scenario: INC-DEMO-001, block-c-electrical-room, status  
critical\_review, response "restrict\_access\_and\_dispatch\_verification". This stands in  
for my teammate's correlation module until it merges.

**Why this step exists and matters:** this is what lets you build your entire Core module without ever touching B1's code — the mock is the interface, not a placeholder to feel guilty about.

### **Step 2 — Audit trail (build this early — B1 needs it too)**

/plan-eng-review  
Create apps/api/audit/audit\_log.py: an append-only table (SQLite) with a function  
append\_event(event\_type: str, payload: dict) that only ever inserts, never updates or  
deletes — no such function should exist anywhere in this file or be exposed via any  
route. Create GET /audit returning the full log in chronological order.

**Explanation of why this matters:** this is the exact function B1's evidence intake calls. Once you've built the real version, tell them — they'll swap their stub for your import at merge time.

**Verify:** try to find any code path that could modify a past entry. There shouldn't be one — this absence is something you should be able to point to directly if a judge asks.

### **Step 3 — `GET /incidents` and `GET /incidents/{id}`**

Create GET /incidents and GET /incidents/{id} in apps/api/routes/incidents.py, calling  
list\_incidents()/get\_incident(id) — for now, import these from  
tests/fixtures/mock\_incident.py instead of the real correlation module. Each response  
should include a sop\_citation field, currently hardcoded to "Review Required" (Member A  
wires the real retrieval here later).

**Verify:** hit both endpoints, confirm you get the hero-scenario incident back with the mocked status/response fields intact.

### **Step 4 — LLM reasoning layer, with fallback**

/plan-eng-review  
Create apps/api/reasoning/explain.py: generate\_explanation(incident, sop\_citation)  
calls a local Ollama model (llama3.1:8b), constrained to: summarize the evidence in  
plain language, restate the cited SOP source exactly (never invent or alter it), state  
an uncertainty level, and list escalate\_if/deescalate\_if from the incident object. The  
function must NOT change incident.status — status always passes through unchanged from  
the rule engine's output, never from the LLM. If OLLAMA\_HOST is unreachable or  
LLM\_ENABLED=false, fall back to a deterministic template producing the same output  
shape with no LLM call. Test both paths explicitly.

**Why the fallback test is non-negotiable:** this is what saves your live demo if the venue GPU has any issue — but only if you've actually run this path once, not just written it.

### **Step 5 — Decision endpoint**

/plan-eng-review  
Create POST /incidents/{id}/decision accepting {action: approve|modify|reject, reason  
(optional), officer\_id}. Reject with 422 if action is modify/reject and reason is  
empty. Only on approve (or modify-with-reason) create a SimulatedResponseTicket. On  
reject, record the decision, create no ticket. Call append\_event() for every incoming  
decision regardless of action.

**Verify:** deliberately POST a "reject" with an empty reason — confirm it's rejected. Test the failure case, not just the happy path.

/review  
Confirm no code path can create a ticket without an explicit approve/modify-with-reason  
decision.

### **Step 6 — Test everything against the mock, then QA**

/qa  
Test /incidents, /incidents/{id}, /incidents/{id}/decision, and /audit against the  
mock incident fixture. Confirm the full flow: view incident → see explanation and  
citation → approve → ticket created → audit shows the trail. Fix any bugs found, write  
regression tests.

**You're done with Core.** Tell B1 you're ready for merge once this passes.

---

## **Merging B1 and B2 into one**

### **Step 1 — Swap the mock for the real thing**

In apps/api/routes/incidents.py, replace the import from  
tests/fixtures/mock\_incident.py with the real list\_incidents()/get\_incident() from  
apps/api/correlation/query.py. In apps/api/routes/evidence.py, replace the stubbed  
append\_event() no-op with the real import from apps/api/audit/audit\_log.py.

**This is the entire merge.** Because you both built against the same frozen contract, this should be a two-line import change, not a rewrite — if it turns out to be more than that, it means the contract drifted somewhere, which is exactly what Step 1's joint freeze session was meant to prevent.

### **Step 2 — Joint review**

/review  
Full diff review of the merged backend against RULES.md §2: confirm no autonomous  
action path exists, no uncited recommendation is possible, sensor "unavailable" never  
collapses to "normal," and the audit trail has no edit/delete path anywhere.

### **Step 3 — Full integration test (this was originally solo "Step 9" — now it's joint)**

Write tests/test\_hero\_scenario.py: post the three hero evidence items via /evidence,  
confirm GET /incidents shows one incident with status critical\_review, confirm the  
explanation cites CAMPUS-FIRE-3.2 (or "Review Required" if Member A hasn't merged  
retrieval yet), post an approve decision, confirm a ticket was created, confirm  
GET /audit shows every event — evidence intake, correlation, recommendation, decision —  
in correct order.

**Run this together, out loud, one person driving.** This is the moment your two halves either genuinely work as one system or don't — don't let it be a solo check either of you does alone and reports back.

/qa  
Run the hero scenario end to end for real, plus Room B (sensor-only) and Room C  
(normal, no incident). Fix anything broken, write regression tests for all three.

### **Step 4 — Ship together**

/ship

**One honest note for both of you:** if merge Step 1 turns into more than a two-line import swap, stop and figure out *why* the contract drifted before patching around it — that drift is exactly the kind of thing that reappears worse during the actual 24-hour build if it's papered over now instead of understood.

