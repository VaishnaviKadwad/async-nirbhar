"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type DragEvent, type FormEvent } from "react";
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
  const [toast, setToast] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ file: File; previewUrl: string | null } | null>(null);

  useEffect(() => {
    const previewUrl = attachment?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [attachment?.previewUrl]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function selectAttachment(file: File | undefined) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    const accepted = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"];
    if (!accepted.includes(file.type) && !["jpg", "jpeg", "png", "webp", "pdf", "txt"].includes(extension ?? "")) {
      setError("Choose a JPG, PNG, WebP, PDF, or text file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Attachments must be 10 MB or smaller.");
      return;
    }
    setError(null);
    setAttachment({ file, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null });
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    selectAttachment(event.dataTransfer.files.item(0) ?? undefined);
  }

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
      setToast(`Evidence ${evidence.id} recorded for officer review.`);
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
    <form className="evidence-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
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

      <div className="attachment-field">
        <label className="upload-zone" htmlFor="attachment" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <input
            id="attachment"
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
            onChange={(event) => selectAttachment(event.target.files?.[0])}
          />
          <span className="upload-glyph" aria-hidden="true">＋</span>
          <span><strong>{attachment ? "Replace attachment" : "Drop a supporting file or browse"}</strong><small>JPG, PNG, WebP, PDF, or TXT · up to 10 MB</small></span>
        </label>
        <p className="attachment-contract-note">Attachment is preview-only; the evidence API currently submits report fields only.</p>
        {attachment && (
          <div className="attachment-preview">
            {attachment.previewUrl ? <Image src={attachment.previewUrl} alt={`Preview of ${attachment.file.name}`} width={72} height={52} unoptimized /> : <span className="file-preview-mark" aria-hidden="true">FILE</span>}
            <div><strong>{attachment.file.name}</strong><span>{(attachment.file.size / 1024).toFixed(0)} KB · local preview</span></div>
            <button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)}>×</button>
          </div>
        )}
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
      {isSubmitting && <div className="submission-progress" role="status"><span /><small>Recording observation…</small></div>}
      <AnimatePresence>
        {toast && <motion.div className="evidence-toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{toast}<button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button></motion.div>}
      </AnimatePresence>
    </form>
  );
}