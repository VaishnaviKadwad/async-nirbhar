"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { postDecision } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import type { Decision } from "@/types/api";

const decisionOptions = [
  { value: "approve", label: "Approve", description: "Approve this proposal" },
  { value: "modify", label: "Escalate", description: "Escalate with a written reason" },
  { value: "reject", label: "Dismiss", description: "Dismiss with a written reason" },
] as const;

export default function DecisionControls({
  incidentId,
  onRecorded,
}: {
  incidentId: string;
  onRecorded?: () => void;
}) {
  const [action, setAction] = useState<Decision["action"]>("approve");
  const [reason, setReason] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendRequiresReason, setBackendRequiresReason] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const reasonRequired = action === "modify" || action === "reject" || backendRequiresReason;

  useEffect(() => {
    if (!isConfirming) return;
    const dialog = dialogRef.current;
    const controls = dialog?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [];
    controls[0]?.focus();
    function keepFocusInside(event: KeyboardEvent) {
      if (event.key !== "Tab" || controls.length === 0) return;
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls[controls.length - 1]?.focus();
      } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
        event.preventDefault();
        controls[0]?.focus();
      }
    }
    dialog?.addEventListener("keydown", keepFocusInside);
    return () => dialog?.removeEventListener("keydown", keepFocusInside);
  }, [isConfirming]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsConfirming(true);
  }

  async function recordDecision() {
    setIsSubmitting(true);
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
        outcome: action === "reject" ? "No response ticket created" : "Response ticket created",
        ticket_id: result && "ticket_id" in result ? result.ticket_id : null,
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
          setIsConfirming(false);
          onRecorded?.();
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
        <div className="decision-actions" role="group" aria-label="Officer decision">
          {decisionOptions.map((option) => (
            <button
              key={option.value}
              className={`decision-option decision-${option.value} ${action === option.value ? "selected" : ""}`}
              type="button"
              aria-pressed={action === option.value}
              onClick={() => setAction(option.value)}
            >
              <strong>{option.label}</strong>
              <small>{option.description}</small>
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
          Review decision
          <span aria-hidden="true">→</span>
        </button>
      </form>
      {isConfirming && (
        <div className="decision-confirm-backdrop">
          <section ref={dialogRef} className="decision-confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-decision-title">
            <p className="panel-kicker">OFFICER CONFIRMATION</p>
            <h3 id="confirm-decision-title">Confirm {decisionOptions.find((option) => option.value === action)?.label.toLowerCase()}?</h3>
            <p>This records your decision for {incidentId}. NIRBHAR will not initiate a response.</p>
            <div className="decision-confirm-actions">
              <button type="button" className="decision-option" onClick={() => setIsConfirming(false)} disabled={isSubmitting}>
                Go back
              </button>
              <button type="button" className="record-decision-button" onClick={() => void recordDecision()} disabled={isSubmitting}>
                {isSubmitting ? "Recording…" : "Confirm and record"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}