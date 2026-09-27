Incident {
  id: string
  zone_id: string
  evidence: [Evidence]              # from the evidence schema
  correlation_reason: string        # plain-language grouping reason
  status: "normal" | "attention" | "high_priority" | "critical_review"
  response: string                  # e.g. "restrict_access_and_dispatch_verification"
  escalate_if: string
  deescalate_if: string
}

append_event(event_type: string, payload: dict) -> None   # audit function signature