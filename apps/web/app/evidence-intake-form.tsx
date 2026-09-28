"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { submitEvidence } from "@/lib/api";
import type { Evidence } from "@/types/api";

type ReportType = Exclude<Evidence["type"], "sensor_event">;

const reportTypes: { value: ReportType; label: string }[] = [
  { value: "student_report", label: "Student report" },
  { value: "guard_report", label: "Security guard report" },
  { value: "warden_report", label: "Warden report" },
];

export default function EvidenceIntakeForm({
  initialTimestamp,
}: {
  initialTimestamp: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setReceipt(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const submittedAt = formData.get("timestamp");
    const campusTimestamp = `${String(submittedAt)}:00+05:30`;

    try {
      const evidence = await submitEvidence({
        type: formData.get("type") as ReportType,
        description: String(formData.get("description")),
        location: String(formData.get("location")),
        timestamp: new Date(campusTimestamp).toISOString(),
      });
      setReceipt(evidence.id);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Evidence could not be submitted. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="evidence-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="type">Report source <span>*</span></label>
        <select id="type" name="type" defaultValue="student_report" required>
          {reportTypes.map((reportType) => (
            <option key={reportType.value} value={reportType.value}>
              {reportType.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="location">Location <span>*</span></label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. Block C Electrical Room"
          autoComplete="off"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="timestamp">When did this happen? <span>*</span></label>
        <input
          id="timestamp"
          name="timestamp"
          type="datetime-local"
          defaultValue={initialTimestamp}
          required
        />
        <span className="field-hint">Campus local time</span>
      </div>

      <div className="form-field">
        <label htmlFor="description">What happened? <span>*</span></label>
        <textarea
          id="description"
          name="description"
          placeholder="Describe only what you observed or were told. Include relevant details; avoid assumptions."
          rows={5}
          maxLength={2000}
          required
        />
      </div>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {receipt && (
        <p className="form-message success-message" role="status">
          Evidence recorded as <strong>{receipt}</strong>. This submission does not
          authorize a response action. <Link href="/">Refresh the Command Center for current incident IDs.</Link>
        </p>
      )}

      <button className="submit-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting evidence…" : "Submit evidence"}
        <span aria-hidden="true">→</span>
      </button>
      <p className="form-footnote">
        Submission records evidence only. Any recommendation or response requires
        an authorized human decision.
      </p>
    </form>
  );
}