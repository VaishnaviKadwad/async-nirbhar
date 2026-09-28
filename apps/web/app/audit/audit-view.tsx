"use client";

import { useEffect, useState } from "react";
import { getAudit } from "@/lib/api";
import type { AuditEntry } from "@/types/api";

const STORAGE_KEY = "nirbhar-audit-entries";

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp));
}

function mergeEntries(entries: AuditEntry[]) {
  return [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export default function AuditView({ initialEntries }: { initialEntries: AuditEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const localEntries: AuditEntry[] = stored ? JSON.parse(stored) : [];
    getAudit().then((freshEntries) => {
      const allEntries = [...freshEntries, ...localEntries];
      const uniqueEntries = allEntries.filter((entry, index, collection) =>
        collection.findIndex((candidate) =>
          candidate.timestamp === entry.timestamp &&
          candidate.incident_id === entry.incident_id &&
          candidate.action === entry.action,
        ) === index,
      );
      setEntries(mergeEntries(uniqueEntries));
    });
  }, []);

  return (
    <section className="audit-list" aria-label="Chronological audit entries">
      {entries.length === 0 ? (
        <p className="empty-state">No audit entries recorded.</p>
      ) : entries.map((entry) => (
        <article className="audit-entry" key={`${entry.timestamp}-${entry.incident_id}-${entry.action}`}>
          <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
          <div className="audit-entry-main">
            <div className="audit-entry-title">
              <strong>{entry.action.replaceAll("_", " ")}</strong>
              <span>{entry.incident_id}</span>
            </div>
            <p>{entry.detail}</p>
          </div>
          <span className="audit-actor">{entry.actor}</span>
        </article>
      ))}
    </section>
  );
}