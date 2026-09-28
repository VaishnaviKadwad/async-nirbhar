NIRBHAR

A local-first decision-support system for campus safety. It correlates incoming reports and sensor events into one incident, applies deterministic rules to set its status, and requires a human officer to approve, modify or reject before any simulated action is created.

Built by Team Yallu for ASYNC'26 (MSRIT), Track 1: Sovereign AI.

What it does
Takes in evidence. Student, guard and warden reports and simulated smoke and temperature sensor events arrive through an API and are stored locally.
Correlates it. Evidence from the same zone within a 15-minute window is grouped into one incident.
Sets the status with rules, not an LLM. Four ordered rules decide the status (normal, attention, high_priority, critical_review) and the recommended response.
Explains and cites. A local LLM summarizes the incident and states its uncertainty. If the LLM is unavailable, a deterministic template is used. The LLM never sets or changes the status. (Explanation layer: Member B2.)
Requires a human decision. An officer approves, modifies or rejects. Modify and reject need a written reason. A simulated ticket is created only after an approve or a modify with a reason. (Decision layer: Member B2.)
Keeps an append-only audit trail. (Audit: Member B2.)

Nothing in the system takes an action without a human decision, and nothing is sent to an external service. [CONFIRM: Member D to confirm the "nothing leaves the machine" claim holds for the final Docker setup.]

Current status

Be aware of what is and is not finished. This table is the honest state as of the last check.

Area	Owner	Status
Evidence intake API, storage, validation	B1	Working (tested)
Rule engine (4 rules, fixed severity order)	B1	Working (tested)
Correlation by zone and time window	B1	Working (tested)
Report text similarity	B1	Placeholder. Returns a constant score, not semantic similarity
Incident query functions, zone status	B1	Working (tested)
Unavailable-sensor reporting	B1	Working, with a limit (see Limitations)
Incident API, decisions, tickets, audit log	B2	Working, per the merged-branch walkthrough [CONFIRM: B2 to re-verify on main]
Local LLM explanation with template fallback	B2	Working, per B2's tests [CONFIRM: B2]
SOP retrieval and citation	A	[CONFIRM: Member A. Until retrieval is merged, the citation field reads Review Required]
Dashboard and incident view	C	[CONFIRM: Member C]
Seed data, fixtures, sensor simulator, Docker	D	[CONFIRM: Member D]
Architecture
 reports + simulated sensors
            |
            v
   POST /evidence  ---->  SQLite (evidence only)
            |
            v
   correlate()  (same zone, 15-minute window)
            |
            v
   rule engine  (4 ordered rules)  ---->  status + recommended response
            |
            v
   Incident  ---->  explanation + SOP citation  ---->  officer decision
                                                        (approve / modify / reject)
                                                              |
                                                              v
                                            simulated ticket + append-only audit log

Design choices worth knowing:

The rules decide, the LLM explains. The status comes from the rule engine only. This is deliberate: the AI does not decide whether something is an emergency.
Rule order is fixed in code. An explicit severity list decides which matching rule wins, so editing the YAML file cannot change the result. A test reverses the rules and checks the winner is unchanged.
Incidents are recomputed from stored evidence on every request. Only evidence is stored, so there is no stale incident state.
Incident ids are deterministic hashes of the zone and the sorted evidence ids. The same evidence gives the same id. Adding evidence changes the id (see Limitations).

Project layout:

apps/api/
  models/evidence.py        evidence schema
  storage/evidence_store.py SQLite storage
  routes/evidence.py        POST /evidence
  rules/rules.yaml          the four rules
  rules/engine.py           rule evaluation
  correlation/correlate.py  grouping into incidents
  correlation/query.py      list_incidents, get_incident, zones_status
  routes/incidents.py       incident and decision routes   (B2)
  reasoning/explain.py      LLM explanation with fallback  (B2)
  audit/audit_log.py        append-only audit log          (B2)
  retrieval/                SOP retrieval                  (A)
apps/web/                   dashboard                      (C)
data/                       policy packs, seed data, fixtures  (A, D)
docs/                       planning and decision docs

[CONFIRM: update the layout to match main once all branches are merged.]

Setup

Requirements: Python 3.11 or newer [CONFIRM: minimum version B2 and D tested]. Ollama is optional.

bash
git clone https://github.com/VaishnaviKadwad/async-nirbhar.git
cd async-nirbhar
python -m venv venv
# Windows:  venv\Scripts\activate
# macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt

Optional: local LLM. Without it, the system uses a deterministic template for explanations.

bash
ollama pull llama3.1:8b

Environment variables

Variable	Purpose
NIRBHAR_DB_PATH	Where the evidence database is stored. Defaults to apps/api/storage/evidence.sqlite3. Set it before the app or any test imports the storage module. It is read once at import time
LLM_ENABLED	false forces the template fallback [CONFIRM: B2]
OLLAMA_HOST	Address of the local Ollama server [CONFIRM: B2]
OLLAMA_TIMEOUT_SECONDS	LLM request timeout. Default 30 [CONFIRM: B2]

[CONFIRM: Member D to add the docker-compose up instructions and verify them from a fresh clone.]

Run
bash
uvicorn apps.api.main:app --reload

Open http://127.0.0.1:8000/docs for the interactive API. When the LLM is enabled, startup waits for a model warm-up, which can take a while on a cold machine [CONFIRM: B2].

Run the tests

bash
pytest -v

B1's module has 26 tests. Combined with B2's, the merged branch reported 59 passing [CONFIRM: update to the final number on main].

Demo: the hero scenario

A fire in the Block C electrical room, reported three ways. Use a fresh database (stop the server and delete the database file to reset).

1. Post four pieces of evidence with POST /evidence. All use zone_id: "block-c-electrical-room" and the evidence ids below. Each returns 201.

id	kind	source_type	state	Extra
evt-room-a-report-001	report	student	positive	text: "smoke near Block C electrical room"
evt-room-a-report-002	report	guard	positive	text: "burning smell near electrical room"
evt-room-a-sensor-001	sensor	temperature_sensor	positive	value 85, unit celsius
evt-room-a-sensor-002	sensor	smoke_sensor	positive	

Give each a category (for example fire) and an occurred_at a few minutes apart, all within 15 minutes.

2. Read the result: GET /incidents returns one incident:

status: critical_review
response: restrict_access_and_dispatch_verification
unavailable_sources: []
incident id: c2b94e3c-cf57-5597-8fbb-d80a4950dc29
SOP citation: [CONFIRM: CAMPUS-FIRE-3.2 if Member A's retrieval is merged, otherwise Review Required]

3. Decide: POST /incidents/{id}/decision with {"action": "approve", "officer_id": "..."} returns a ticket. A second decision on the same incident returns 409.

4. Audit: GET /audit shows the events in order.

Why four items and not three: only a positive smoke sensor counts as smoke. A report whose text says "smoke" does not. With just the two reports and a temperature sensor, the rules return attention, not critical_review.

API
Method	Path	Purpose	Owner
POST	/evidence	Store evidence. 201 on success, 422 for a bad value or timestamp, 409 for a duplicate id	B1
GET	/incidents	All current incidents	B2
GET	/incidents/{id}	One incident, 404 if the id does not resolve	B2
POST	/incidents/{id}/decision	Approve, modify or reject. 422 if modify or reject has no reason	B2
GET	/audit	The full audit trail in order	B2

[CONFIRM: B2 to confirm this list against main. A zones-status route was planned.]

The rules

Checked in this order. The first match wins. If none match, the status is normal.

#	Rule	Condition	Status	Response
1	fire-multi-signal	At least one report, and a positive smoke sensor, and a positive temperature sensor	critical_review	restrict_access_and_dispatch_verification
2	sensor-led-fire	A positive smoke or temperature sensor, and no reports	high_priority	dispatch_verification
3	clustered-reports	Three or more positive reports within 15 minutes	high_priority	dispatch_verification
4	single-credible-signal	Any positive smoke sensor, temperature sensor or report	attention	verify_with_sop

Only evidence with state: positive counts. A sensor is "abnormal" because its state is positive. The numeric value is stored but not compared against any threshold.

Limitations
Text similarity is a placeholder. Any two non-empty report texts get the same score, so the 0.70 threshold never rejects a pair. Correlation is by zone and time window only. [CONFIRM: remove this line only if Member A's real embeddings are wired into correlation.]
An unavailable sensor is reported, not treated as a status. Each incident lists sensors that reported unavailable in unavailable_sources, and it never changes the rule engine's status. A zone whose only evidence is unavailable sensors still has status normal, so an interface must show unavailable_sources and never display a plain "Normal" in that case.
Incident ids change when evidence is added. A decision made against an old id fails as not found. This is a documented tradeoff, mitigated and not fixed. See docs/DECISIONS.md.
A room with only normal evidence still produces a normal incident. A room with no evidence produces no incident.
Grouping is simple. No category or policy-pack matching. Evidence joins the first group that fits, and the 15-minute window is measured from that group's earliest item.
A mistyped zone id is not detected. Asking for the status of an unknown zone returns normal.
No authentication on the evidence endpoint. This is a prototype using synthetic data.
All sensor data is simulated.
Data

All evidence in this project is synthetic. [CONFIRM: Member A and D to list every data source, including SOP documents and their origin, and to fill in data/SOURCES.md, which is currently only a heading.]

What was built when, and with what

[CONFIRM: fill in the event window and what existed before it.] Git history shows planning documents and repository setup on Sept 27, 2026 and B1's implementation commits on Sept 28, 2026. Nothing in this repository was built before the event except [CONFIRM: any pre-existing code or libraries].

AI assistance. Code was written with AI coding assistants (Codex, with review and investigation skills from gstack) prompted and reviewed by team members. [CONFIRM: each member to state which tools they used.]

Libraries. FastAPI, Pydantic, SQLAlchemy, SQLite, PyYAML, pytest. Ollama with llama3.1:8b for explanations. sentence-transformers is listed as a dependency, but the B1 correlation code does not use it. [CONFIRM: Member A to state whether retrieval uses it.]

Team

Team Yallu

Role	Responsibility	Name
Member A	SOP policy packs and retrieval	[CONFIRM]
Member B1	Evidence intake, rule engine, correlation	[CONFIRM]
Member B2	Incident API, LLM explanation, decisions, audit	[CONFIRM]
Member C	Dashboard	[CONFIRM]
Member D	Data, fixtures, sensor simulator, Docker, tests	[CONFIRM]
License

[CONFIRM: MIT, as planned. Check that a LICENSE file exists in the repo root.]

Content
member b.md

82 lines

MD

Btask.md

246 lines

MD

things.md

417 lines

MD

b2.md

123 lines

MD

b1.md

167 lines

MD

cd ~/gstack && git pull && ./setup --host codex Already up to date. Codex skill profile: gpt-6-astra Source: default (gpt-6-astra) Qualified CSO images were not preloaded: Contained target execution requires a Linux or macOS host with amd64/arm64 Linux Docker images. Static audits remain avail

PASTED

Codex just found the actual flaw in the design, not just an implementation detail — this is worth stopping on, not waving through. ## The real problem A two-read guard inside a single POST can't detect the thing it was built to detect. If the incident id changed *between the GET and the POST* (t

PASTED

# NIRBHAR B2 Handoff: Reasoning, API Surface, Decisions & Audit ## 1. Implementation by File - `apps/api/audit/audit_log.py`: Append-only SQLite audit log. `append_event(event_type: str, payload: dict) -> None` inserts an event with server-generated UTC timestamp; `get_all_events()` returns pa

PASTED

# NIRBHAR B1 Handoff: Evidence Intake & Correlation Engine ## 1. Implementation by File - `apps/api/models/evidence.py` — Defines `Evidence(BaseModel)`, the Pydantic evidence contract described below. - `apps/api/storage/evidence_store.py` — Defines the local SQLite `engine`, `evidence_table`

PASTED

(venv) PS V:\Nirbhar> pytest apps/api/correlation/test_multi_room.py -v =============================test session starts ============================= platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.6.0-- V:\Nirbhar\venv\Scripts\python.exe cachedir: .pytest_cache rootdir: V:\Nirbhar con

PASTED

(venv) PS V:\Nirbhar> pytest apps/api/ -v =============================test session starts ============================= platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.6.0-- V:\Nirbhar\venv\Scripts\python.exe cachedir: .pytest_cache rootdir: V:\Nirbhar configfile: pytest.ini plugins:

PASTED

# NIRBHAR B1 Handoff: Evidence Intake & Correlation Engine ## 1. Implementation by File - `apps/api/models/evidence.py` — Defines `Evidence(BaseModel)`, the Pydantic evidence contract described below. - `apps/api/storage/evidence_store.py` — Defines the local SQLite `engine`, `evidence_table`

PASTED

**Evidence basis:** Current checkout is `member-b1-correlation` at `275db14`, with a clean worktree. I inspected its source, tests, docs and visible Git history. `python -m compileall -q apps` passed, which verifies Python syntax only. I could not run pytest: it is missing from Python 3.10, 3.11 and

PASTED

## 1. My role and the files I own (exact paths, approximate line counts) The visible B1 commits cover evidence intake, rules, correlation and queries. Current line counts: - Evidence intake and storage: - [apps/api/models/evidence.py](/V:/Nirbhar/apps/api/models/evidence.py) — 24 - [apps

PASTED

async_registration.md

1 line

MD
