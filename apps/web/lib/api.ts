import type { Evidence, EvidenceSubmission, Incident, IncidentExplanation, Decision, DecisionResult, AuditEntry, ZoneStatus, ZoneStatuses } from "@/types/api";
import { ApiError } from "./api-error";
import * as mock from "./mocks";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/backend";

async function realFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Server components need an absolute URL; browsers continue through Next's API rewrite.
  const url = typeof window === "undefined"
    ? new URL(path, process.env.API_SERVER_URL ?? "http://127.0.0.1:8000").toString()
    : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
        ? body.detail
        : body && typeof body === "object" && "message" in body && typeof body.message === "string"
          ? body.message
          : `API error ${res.status} on ${path}`;
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.text();
  return body ? (JSON.parse(body) as T) : (undefined as T);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function zoneIdFromLocation(location: string): string {
  return location.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeEvidence(value: unknown): Evidence {
  const evidence = isRecord(value) ? value : {};
  const source = stringValue(evidence.source_type, stringValue(evidence.type));
  const isSensor = evidence.kind === "sensor" || source.includes("sensor") || source === "sensor_event";
  const type: Evidence["type"] = isSensor
    ? "sensor_event"
    : source.includes("guard")
      ? "guard_report"
      : source.includes("warden")
        ? "warden_report"
        : "student_report";
  return {
    id: stringValue(evidence.id, "unknown-evidence"),
    type,
    description: stringValue(evidence.description, stringValue(evidence.text, `${source || "Unknown source"} signal`)),
    location: stringValue(evidence.location, stringValue(evidence.zone_id, "Unknown location")),
    timestamp: stringValue(evidence.timestamp, stringValue(evidence.occurred_at, new Date(0).toISOString())),
    synthetic: evidence.synthetic === true,
  };
}

function normalizeIncident(value: unknown): Incident {
  const incident = isRecord(value) ? value : {};
  const citationValue = incident.citation;
  const citationRecord = isRecord(citationValue) ? citationValue : null;
  const sopRecord = isRecord(incident.sop) ? incident.sop : null;
  const recommendationValue = isRecord(incident.recommendation) ? incident.recommendation : null;
  const status = incident.status;
  const normalizedStatus: Incident["status"] = status === "normal" || status === "attention" || status === "high_priority" || status === "critical_review"
    ? status
    : "attention";
  const rawEvidence = Array.isArray(incident.evidence) ? incident.evidence : [];
  const confidence = recommendationValue?.confidence;
  const recommendationText = stringValue(
    recommendationValue?.text,
    stringValue(incident.response).replaceAll("_", " ").replace(/^./, (firstCharacter) => firstCharacter.toUpperCase()),
  );
  const citationStatus = typeof incident.sop_citation === "string" ? incident.sop_citation : undefined;
  const unavailableSources = Array.isArray(incident.unavailable_sources)
    ? incident.unavailable_sources.filter((source): source is string => typeof source === "string")
    : [];
  const citationId = typeof incident.sop_citation === "string" ? incident.sop_citation : undefined;
  const citation = sopRecord
    && citationId
    && citationId !== "Review Required"
    && typeof sopRecord.title === "string"
    && typeof sopRecord.text === "string"
    ? {
        id: citationId,
        title: sopRecord.title,
        excerpt: sopRecord.text,
        score: typeof sopRecord.score === "number" ? sopRecord.score : undefined,
      }
    : citationRecord && typeof citationRecord.id === "string" && typeof citationRecord.title === "string" && typeof citationRecord.excerpt === "string"
      ? { id: citationRecord.id, title: citationRecord.title, excerpt: citationRecord.excerpt }
      : null;

  return {
    id: stringValue(incident.id, "unknown-incident"),
    zone: stringValue(incident.zone, stringValue(incident.zone_id, "unknown-zone")),
    status: normalizedStatus,
    evidence: rawEvidence.map(normalizeEvidence),
    correlation_reason: typeof incident.correlation_reason === "string" ? incident.correlation_reason : null,
    citation,
    citation_status: citationStatus,
    unavailable_sources: unavailableSources,
    recommendation: recommendationText
      ? {
          text: recommendationText,
          confidence: typeof confidence === "number" ? confidence : undefined,
          what_would_change_my_mind: stringValue(
            recommendationValue?.what_would_change_my_mind,
            stringValue(incident.deescalate_if),
          ),
        }
      : null,
  };
}

function normalizeAuditEntry(value: unknown): AuditEntry {
  const row = isRecord(value) ? value : {};
  const payload = isRecord(row.payload) ? row.payload : row;
  const action = stringValue(payload.action, stringValue(row.event_type, "event_recorded")).replaceAll(".", "_");
  const ticket = isRecord(payload.ticket) ? payload.ticket : null;
  const status = payload.severity;
  const rawOutcome = stringValue(payload.outcome);
  const outcome = rawOutcome === "ticket_created"
    ? "Response ticket created"
    : rawOutcome === "decision_recorded"
      ? "Decision recorded; no external response initiated"
    : rawOutcome === "recorded_no_ticket"
      ? "Decision recorded; no external response initiated"
      : rawOutcome === "invalid_reason"
        ? "Decision reason required"
        : rawOutcome === "incident_not_found"
          ? "Incident not found"
          : rawOutcome || undefined;
  return {
    timestamp: stringValue(row.timestamp, stringValue(payload.timestamp, new Date(0).toISOString())),
    incident_id: stringValue(payload.incident_id, "unassigned"),
    actor: stringValue(payload.actor, stringValue(payload.officer_id, "system")),
    action,
    detail: stringValue(payload.detail, stringValue(payload.reason, stringValue(payload.outcome, action.replaceAll("_", " ")))),
    severity: status === "normal" || status === "attention" || status === "high_priority" || status === "critical_review" ? status : undefined,
    outcome,
    ticket_id: stringValue(payload.ticket_id, ticket ? stringValue(ticket.ticket_id) : "") || null,
  };
}

export async function submitEvidence(evidence: EvidenceSubmission): Promise<Evidence> {
  if (USE_MOCKS) return mock.submitEvidence(evidence);

  const sourceType = {
    student_report: "student",
    guard_report: "guard",
    warden_report: "warden",
  }[evidence.type];
  const payload = {
    kind: "report",
    category: "fire_hazard",
    source_type: sourceType,
    zone_id: zoneIdFromLocation(evidence.location),
    occurred_at: evidence.timestamp,
    state: "positive",
    text: evidence.description,
  };
  return normalizeEvidence(await realFetch<unknown>("/evidence", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function getIncidents(): Promise<Incident[]> {
  if (USE_MOCKS) return mock.getIncidents();
  const incidents = await realFetch<unknown>("/incidents", { cache: "no-store" });
  return Array.isArray(incidents) ? incidents.map(normalizeIncident) : [];
}

export async function getZones(): Promise<ZoneStatuses> {
  if (USE_MOCKS) {
    const incidents = await mock.getIncidents();
    return Object.fromEntries(["block-c-electrical-room", "lab-2", "classroom-3"].map((zone) => {
      const incident = incidents.find((item) => item.zone === zone);
      return [zone, {
        status: incident?.status ?? "normal",
        incident_id: incident?.evidence.length ? incident.id : null,
        unavailable_sources: incident?.unavailable_sources ?? [],
      }];
    }));
  }

  const value = await realFetch<unknown>("/zones", { cache: "no-store" });
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([zone, rawStatus]) => {
    if (!isRecord(rawStatus)) return [];
    const status = rawStatus.status;
    const normalizedStatus: ZoneStatus["status"] = status === "normal" || status === "attention" || status === "high_priority" || status === "critical_review"
      ? status
      : "normal";
    return [[zone, {
      status: normalizedStatus,
      incident_id: typeof rawStatus.incident_id === "string" ? rawStatus.incident_id : null,
      unavailable_sources: Array.isArray(rawStatus.unavailable_sources)
        ? rawStatus.unavailable_sources.filter((source): source is string => typeof source === "string")
        : [],
    } satisfies ZoneStatus]];
  }));
}

export async function getIncident(id: string): Promise<Incident> {
  if (USE_MOCKS) return mock.getIncident(id);
  return normalizeIncident(await realFetch<unknown>(`/incidents/${encodeURIComponent(id)}`, { cache: "no-store" }));
}

export async function getIncidentExplanation(
  id: string,
  signal?: AbortSignal,
): Promise<IncidentExplanation> {
  const response = await realFetch<unknown>(
    `/incidents/${encodeURIComponent(id)}/explanation`,
    { cache: "no-store", signal },
  );
  if (
    !isRecord(response)
    || typeof response.summary !== "string"
    || typeof response.citation !== "string"
    || (response.uncertainty !== "low" && response.uncertainty !== "medium" && response.uncertainty !== "high")
    || typeof response.escalate_if !== "string"
    || typeof response.deescalate_if !== "string"
  ) {
    throw new Error("The incident explanation response did not match the expected format.");
  }
  return {
    summary: response.summary,
    citation: response.citation,
    uncertainty: response.uncertainty,
    escalate_if: response.escalate_if,
    deescalate_if: response.deescalate_if,
  };
}

export async function postDecision(id: string, decision: Decision): Promise<DecisionResult | void> {
  if (USE_MOCKS) return mock.postDecision(id, decision);
  const response = await realFetch<unknown>(`/incidents/${encodeURIComponent(id)}/decision`, {
        method: "POST",
        body: JSON.stringify(decision),
      });
  if (!isRecord(response)) return undefined;
  const ticket = isRecord(response.ticket) ? response.ticket : null;
  return {
    ticket_id: stringValue(response.ticket_id, ticket ? stringValue(ticket.ticket_id) : "") || null,
  };
}

export async function getAudit(): Promise<AuditEntry[]> {
  if (USE_MOCKS) return mock.getAudit();
  const entries = await realFetch<unknown>("/audit", { cache: "no-store" });
  return Array.isArray(entries) ? entries.map(normalizeAuditEntry) : [];
}
