# NIRBHAR — Security, Ethics, and Compliance

## 1. Threat Model

| Threat | Mitigation |
|---|---|
| Prompt injection via ingested SOP or report text | All ingested/retrieved text is treated as untrusted data, never as an instruction to the LLM or rule engine |
| Data leakage to a third party | Fully local deployment — no SOP text, report, incident, or decision is ever sent to an external API |
| Unauthorized or accidental autonomous action | Hard-coded human approval gate; no code path allows an action without an explicit officer decision |
| Fabricated safety guidance | Recommendations without a valid SOP citation return "Review Required," never invented advice |
| Silent sensor failure treated as "all clear" | Sensor state machine has an explicit "unavailable" state that can never collapse into "normal" |
| Tampering with the historical record | Audit trail is append-only; no edit or delete path exists in the UI, API, or internal tooling |

## 2. Data Classification

All data used in the MVP is either fully synthetic or public/adapted-with-disclosure. No real
student names, phone numbers, actual incident reports, or sensitive floor plans are used
anywhere in the system. Every dataset's origin and any modifications are declared in
`data/SOURCES.md`.

## 3. Prompt-Injection Controls

- Retrieved SOP text and submitted report text are passed to the LLM strictly as *data* within
  a fixed prompt template — never concatenated in a way that lets embedded text be interpreted
  as a system instruction
- The LLM's output is constrained to a fixed structure (summary, citation, uncertainty,
  mind-change conditions) and validated before display — free-form instructions in its output
  are not executed as commands anywhere in the system

## 4. Local-Data Protection

- No cloud calls anywhere in the default pipeline — LLM inference, retrieval, and storage are
  all local
- `.env`, credentials, and raw logs are never committed to the repository
- Demo/seed data is clearly and permanently labeled as synthetic or adapted-public within the
  data files themselves, not only in documentation

## 5. Responsible-AI Behavior

- Every recommendation must be grounded in a cited source; ungrounded output is not permitted
- Uncertainty is always shown alongside a recommendation, never omitted for a cleaner UI
- The system never claims certainty it doesn't have, and never claims to replace human
  judgment
- The UI carries a persistent "decision support only" notice
- The project does not claim to meet fire-safety certification standards or to replace any
  institution's official emergency procedures

## 6. Compliance Checklist

- [ ] Store only synthetic or public-adapted demo data
- [ ] Do not collect any real student or safety incident data
- [ ] Do not commit `.env`, credentials, sensitive documents, or raw logs
- [ ] Treat all ingested/retrieved document text as untrusted data
- [ ] Require human approval before every simulated response action
- [ ] Clearly label all signals/data as Synthetic, Simulated, or Public-adapted
- [ ] Display a "decision support only" notice in the UI
- [ ] Never claim this prototype meets fire-safety certification or replaces official procedure
