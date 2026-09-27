# NIRBHAR — Design

## 1. Design Principles

1. **Evidence-first, not chat-first.** The interface should never look like a chatbot. Lead
   with the incident timeline, the evidence graph, and the approval controls — the LLM's text
   explanation is one panel among several, not the whole screen.
2. **Trustworthy over flashy.** This is a safety tool. Calm, high-contrast, legible from a
   projector at demo distance. No dark-pattern urgency, no unnecessary animation.
3. **Uncertainty is visible, not hidden.** Every recommendation shows its confidence and its
   "what would change my mind" conditions in the same view — never buried in a tooltip.
4. **Nothing implies autonomy.** No button should ever suggest the system can act by itself.
   Every action-taking control is explicitly framed as a proposal awaiting a human decision.

## 2. Screens

### 2.1 Command Center Dashboard (home screen)
Three room cards side by side: Block C Electrical Room, Lab 2, Classroom 3. Each card shows
current status (Normal / Attention / High Priority / Critical Review), last evidence
timestamp, and device heartbeat. This is the first thing a judge sees — it should immediately
communicate "this system watches multiple zones and only flags what's real."

### 2.2 Incident Detail View
Opened by clicking a room in Attention/High/Critical status. Contains, top to bottom:
- **Incident header** — ID, status, zone, opened time
- **Evidence timeline** — chronological list of every report/sensor event that built this
  incident, each tagged with source type
- **Evidence graph** — visual node graph (incident → evidence → SOP section → recommendation
  → officer decision)
- **SOP citation panel** — exact source title, section ID, and quoted excerpt
- **Recommendation panel** — summary, proposed steps, uncertainty statement
- **"What would change my mind" panel** — escalate conditions, de-escalate conditions,
  missing/unavailable evidence, shown as three short labeled lists
- **Approval controls** — three buttons: Approve / Modify / Reject. Modify and Reject open a
  required reason field before submitting.

### 2.3 Audit Log View
Flat, timestamped, append-only list: every evidence intake, retrieval, recommendation,
citation, and officer decision, in order. No edit or delete controls exist anywhere near this
screen — the absence of an edit button is itself part of the pitch.

### 2.4 Policy-Pack Switcher (if kept)
A single visible toggle (Campus / Factory) in the dashboard header. Switching immediately
changes the SOP corpus and rule set in use — this should be demonstrably instant, not a page
reload that looks like a different app.

### 2.5 Risk Heatmap
A simple zone-by-time grid over synthetic historical incidents, clearly labeled: **"Historical
synthetic incident density — not predictive risk."** This label must be visible on the screen
itself, not just in the README.

## 3. Status Color Coding

| Status | Color | Meaning |
|---|---|---|
| Normal | Green | No credible evidence, device heartbeat OK |
| Attention | Yellow | One credible signal, needs verification |
| High Priority | Orange | Multiple/sensor-led evidence, dispatch verification |
| Critical Review | Red | High-evidence incident, urgent officer decision needed |

Never use red for anything the system itself has done autonomously — red is reserved for
"needs a human now," reinforcing the human-in-the-loop framing visually.

## 4. Evidence Graph — Visual Legend

- **Nodes:** incident, student/guard report, sensor event, room/zone, SOP section, historical
  incident, recommendation, officer decision
- **Edges:** `supports`, `reported_at`, `correlates_with`, `governed_by`, `similar_to`,
  `approved_by`
- Keep the graph readable at a glance — cap visible nodes per incident to what the hero
  scenario actually produces (roughly 6–8 nodes), don't let it become illegible clutter.

## 5. Approval Flow — Interaction Notes

Approve is a single click with no further input required (fastest path, since most
recommendations should be straightforward to accept). Modify and Reject both require a short
written reason before the button becomes clickable — this is a deliberate friction point that
reinforces accountability, not a UX oversight to "fix" later.

## 6. Projector-Readability Checklist

- Minimum 18px body text, 24px+ for status labels
- High contrast; no light-gray-on-white text anywhere
- Graph and heatmap must be legible without zooming during a live demo
- Every screen the demo script visits must load in under 2 seconds on the venue's network/GPU
