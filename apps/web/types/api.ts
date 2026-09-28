export type IncidentStatus = "normal" | "attention" | "high_priority" | "critical_review";

export interface Evidence {
  id: string;
  type: "student_report" | "guard_report" | "warden_report" | "sensor_event";
  description: string;
  location: string;
  timestamp: string; // ISO 8601
}

export interface SopCitation {
  id: string;        // e.g. "CAMPUS-FIRE-3.2"
  title: string;
  excerpt: string;   // exact source text, not a paraphrase
}

export interface Recommendation {
  text: string;
  confidence: number;          // 0–1
  what_would_change_my_mind: string;
}

export interface Incident {
  id: string;
  zone: string;
  status: IncidentStatus;
  evidence: Evidence[];
  correlation_reason: string | null;
  citation: SopCitation | null;   // null when review_required
  recommendation: Recommendation | null;
}

export interface Decision {
  action: "approve" | "modify" | "reject";
  reason: string;
  officer_id: string;
}

export interface DecisionResult {
  ticket_id: string | null;
}

export interface AuditEntry {
  timestamp: string;
  incident_id: string;
  actor: string;
  action: string;
  detail: string;
}