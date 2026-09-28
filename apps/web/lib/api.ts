import type { Evidence, Incident, Decision, DecisionResult, AuditEntry } from "@/types/api";
import { ApiError } from "./api-error";
import * as mock from "./mocks";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function realFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
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

export async function submitEvidence(evidence: Omit<Evidence, "id">): Promise<Evidence> {
  return USE_MOCKS
    ? mock.submitEvidence(evidence)
    : realFetch("/evidence", { method: "POST", body: JSON.stringify(evidence) });
}

export async function getIncidents(): Promise<Incident[]> {
  return USE_MOCKS ? mock.getIncidents() : realFetch("/incidents", { cache: "no-store" });
}

export async function getIncident(id: string): Promise<Incident> {
  return USE_MOCKS ? mock.getIncident(id) : realFetch(`/incidents/${id}`, { cache: "no-store" });
}

export async function postDecision(id: string, decision: Decision): Promise<DecisionResult | void> {
  return USE_MOCKS
    ? mock.postDecision(id, decision)
    : realFetch<DecisionResult | void>(`/incidents/${id}/decision`, {
        method: "POST",
        body: JSON.stringify(decision),
      });
}

export async function getAudit(): Promise<AuditEntry[]> {
  return USE_MOCKS ? mock.getAudit() : realFetch("/audit");
}