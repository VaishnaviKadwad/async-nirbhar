"use client";

import { useState, type FormEvent } from "react";
import { postDecision } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import type { Decision } from "@/types/api";

export default function DecisionControls({ incidentId }: { incidentId: string }) {
  const [action, setAction] = useState<Decision["action"]>("approve");
  const [reason, setReason] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendRequiresReason, setBackendRequiresReason] = useState(false);
  const reasonRequired = action === "modify" || action === "reject" || backendRequiresReason;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const result = await postDecision(incidentId, {
        action,
        reason: reason.trim(),
        officer_id: officerId.trim(),
      });
      const auditEntry = {
        timestamp: new Date().toISOString(),
        incident_id: incidentId,
        actor: officerId.trim(),
        action,
        detail: reason.trim(),
      };
      const existing = JSON.parse(localStorage.getItem("nirbhar-audit-entries") ?? "[]");
      localStorage.setItem("nirbhar-audit-entries", JSON.stringify([...existing, auditEntry]));
      if (action === "reject") {
        setMessage("Rejection recorded. No response ticket was created.");
      } else {
        const ticketId = result && "ticket_id" in result ? result.ticket_id : null;
        setMessage(ticketId
          ? `${action[0].toUpperCase()}${action.slice(1)} recorded. Response ticket ${ticketId} was created.`
          : `${action[0].toUpperCase()}${action.slice(1)} recorded. A response ticket was created.`);
      }
    } catch (submissionError) {
      if (submissionError instanceof ApiError && submissionError.status === 404) {
        setError("This incident ID is no longer current or was not found. Return to the Command Center and refresh the incident list.");
      } else if (submissionError instanceof ApiError && submissionError.status === 409) {
        setError("A decision has already been recorded for this incident. Refresh the Command Center before reviewing it again.");
      } else if (submissionError instanceof ApiError && submissionError.status === 422) {
        setBackendRequiresReason(true);
        setError("The backend requires a reason for this decision. Add one below and submit again.");
      } else {
        setError(submissionError instanceof Error ? submissionError.message : "Decision could not be recorded.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="decision-card" aria-labelledby="decision-title">
      <div className="decision-heading">
        <div>
          <p className="panel-kicker">OFFICER CHECKPOINT</p>
          <h2 id="decision-title">Make a human decision</h2>
        </div>
        <span className="decision-lock">Nothing is automatic</span>
      </div>
      <p className="decision-intro">This recommendation is a proposal. Record your decision and the evidence-based reason before any response is considered.</p>
      <form className="decision-form" onSubmit={handleSubmit}>
        <div className="decision-actions" role="group" aria-label="Decision type">
          {(["approve", "modify", "reject"] as const).map((option) => (
            <button
              key={option}
              className={`decision-option decision-${option} ${action === option ? "selected" : ""}`}
              type="button"
              onClick={() => setAction(option)}
            >
              {option[0].toUpperCase() + option.slice(1)} proposal
            </button>
          ))}
        </div>
        <div className="decision-fields">
          <div className="form-field">
            <label htmlFor="officer-id">Officer ID <span>*</span></label>
            <input id="officer-id" value={officerId} onChange={(event) => setOfficerId(event.target.value)} placeholder="e.g. OFFICER-014" required />
          </div>
          <div className="form-field decision-reason-field">
            <label htmlFor="decision-reason">Decision reason {reasonRequired && <span>*</span>}</label>
            <textarea id="decision-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="State why you approved, modified, or rejected the proposal." rows={3} required={reasonRequired} />
          </div>
        </div>
        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {message && <p className="form-message success-message" role="status">{message}</p>}
        <button className="record-decision-button" type="submit" disabled={isSubmitting || !officerId.trim() || (reasonRequired && !reason.trim())}>
          {isSubmitting ? "Recording decision…" : "Record human decision"}
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  );
}