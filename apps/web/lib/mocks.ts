import type { Evidence, Incident, Decision, DecisionResult, AuditEntry } from "@/types/api";
import { ApiError } from "./api-error";

// In-memory audit log so postDecision() calls actually show up in getAudit()
const auditLog: AuditEntry[] = [
  {
    timestamp: "2026-09-27T09:00:00Z",
    incident_id: "INC-DEMO-001",
    actor: "system",
    action: "incident_created",
    detail: "Correlated 2 reports + 1 sensor event into incident INC-DEMO-001",
    severity: "critical_review",
    outcome: "Incident assembled for officer review",
  },
];

// Room A — confirmed multi-signal incident (the hero scenario)
const incidentA: Incident = {
  id: "INC-DEMO-001",
  zone: "block-c-electrical-room",
  status: "critical_review",
  evidence: [
    {
      id: "EV-001",
      type: "sensor_event",
      description: "Smoke detector triggered — high particulate reading",
      location: "Block C Electrical Room",
      timestamp: "2026-09-27T08:55:00Z",
    },
    {
      id: "EV-002",
      type: "student_report",
      description: "Student reported smell of burning near Block C corridor",
      location: "Block C Electrical Room",
      timestamp: "2026-09-27T08:57:00Z",
    },
    {
      id: "EV-003",
      type: "guard_report",
      description: "Security guard confirmed visible smoke near electrical panel",
      location: "Block C Electrical Room",
      timestamp: "2026-09-27T08:58:00Z",
    },
  ],
  unavailable_sources: [],
  correlation_reason:
    "3 signals within a 15-minute window, same zone (Block C Electrical Room), same category (fire) — sensor reading corroborated by two independent human reports.",
  citation: {
    id: "CAMPUS-FIRE-3.2",
    title: "Electrical Room Fire Response",
    // TODO: replace with the exact excerpt from data/campus_sop.md once you copy it over
    excerpt:
      "In the event of suspected electrical fire in a restricted equipment room, isolate the zone, do not attempt to extinguish without confirming power isolation, and escalate to campus fire safety officer immediately.",
  },
  recommendation: {
    text: "Escalate to Fire Safety Officer and isolate Block C Electrical Room per CAMPUS-FIRE-3.2. Multi-signal confirmation (sensor + 2 human reports) supports high-confidence fire response.",
    confidence: 0.87,
    what_would_change_my_mind:
      "If the smoke detector reading was later found to be a false positive (e.g. dust triggering sensor) with no corroborating human report, confidence would drop below the escalation threshold.",
  },
};

// Room B — sensor-only incident, lower confidence
const incidentB: Incident = {
  id: "INC-DEMO-002",
  zone: "lab-2",
  status: "attention",
  evidence: [
    {
      id: "EV-004",
      type: "sensor_event",
      description: "Minor temperature spike detected",
      location: "Lab 2",
      timestamp: "2026-09-27T09:10:00Z",
    },
  ],
  unavailable_sources: [],
  correlation_reason:
    "Single sensor signal, no corroborating human report yet — below the multi-signal confirmation threshold.",
  citation: null,
  recommendation: {
    text: "Monitor Lab 2 for additional signals before escalating. Single uncorroborated sensor reading does not meet the fire-multi-signal rule threshold.",
    confidence: 0.42,
    what_would_change_my_mind:
      "A second independent report (human or sensor) within the next 15 minutes would raise this to a confirmed multi-signal incident.",
  },
};

// Room C — stays Normal, proves the system doesn't hallucinate incidents
const incidentC: Incident = {
  id: "INC-DEMO-003",
  zone: "classroom-3",
  status: "normal",
  evidence: [],
  unavailable_sources: [],
  correlation_reason: null,
  citation: null,
  recommendation: null,
};

const incidents = [incidentA, incidentB, incidentC];
const decidedIncidentIds = new Set<string>();
let evidenceSequence = 100;
let ticketSequence = 1;

const roomZones: { zone: string; matches: string[] }[] = [
  { zone: "block-c-electrical-room", matches: ["block c", "block-c", "electrical room"] },
  { zone: "lab-2", matches: ["lab 2", "lab-2"] },
  { zone: "classroom-3", matches: ["classroom 3", "classroom-3"] },
];

export async function submitEvidence(evidence: Omit<Evidence, "id">): Promise<Evidence> {
  const submittedEvidence: Evidence = { ...evidence, id: `EV-${evidenceSequence++}` };
  const location = evidence.location.toLowerCase();
  const room = roomZones.find(({ matches }) => matches.some((match) => location.includes(match)));
  const incident = room && incidents.find((item) => item.zone === room.zone);

  if (incident) {
    const previousId = incident.id;
    const revisionMatch = previousId.match(/^(.*)-R(\d+)$/);
    const baseId = revisionMatch?.[1] ?? previousId;
    const revision = Number(revisionMatch?.[2] ?? 1) + 1;
    incident.id = `${baseId}-R${revision}`;
    incident.evidence = [...incident.evidence, submittedEvidence].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    if (incident.status === "normal") incident.status = "attention";
    decidedIncidentIds.delete(previousId);
  }

  auditLog.push({
    timestamp: new Date().toISOString(),
    incident_id: incident?.id ?? "unassigned",
    actor: evidence.type,
    action: "evidence_submitted",
    detail: `${submittedEvidence.id} submitted for ${evidence.location}`,
    severity: incident?.status,
    outcome: "Evidence appended to the review trail",
  });
  return submittedEvidence;
}

export async function getIncidents(): Promise<Incident[]> {
  return incidents.map((incident) => ({ ...incident, evidence: [...incident.evidence] }));
}

export async function getIncident(id: string): Promise<Incident> {
  const found = incidents.find((incident) => incident.id === id);
  if (!found) throw new ApiError(404, "Incident not found. Refresh the Command Center for current incident IDs.");
  return { ...found, evidence: [...found.evidence] };
}

export async function postDecision(id: string, decision: Decision): Promise<DecisionResult> {
  if (!incidents.some((incident) => incident.id === id)) {
    throw new ApiError(404, "Incident not found. Refresh the Command Center for current incident IDs.");
  }
  if (decidedIncidentIds.has(id)) {
    throw new ApiError(409, "This incident already has a recorded decision. Refresh the Command Center.");
  }
  if (!decision.reason.trim()) {
    throw new ApiError(422, "A decision reason is required.");
  }

  decidedIncidentIds.add(id);
  const ticketId = decision.action === "reject" ? null : `TKT-${ticketSequence++}`;
  const incident = incidents.find((item) => item.id === id);
  auditLog.push({
    timestamp: new Date().toISOString(),
    incident_id: id,
    actor: decision.officer_id,
    action: decision.action,
    detail: decision.reason,
    severity: incident?.status,
    outcome: ticketId ? "Response ticket created" : "No response ticket created",
    ticket_id: ticketId,
  });
  return { ticket_id: ticketId };
}

export async function getAudit(): Promise<AuditEntry[]> {
  return [...auditLog];
}
