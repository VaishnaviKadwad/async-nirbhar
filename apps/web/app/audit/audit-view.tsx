"use client";

import { useEffect, useState } from "react";
import { getAudit } from "@/lib/api";
import type { AuditEntry, IncidentStatus } from "@/types/api";

const STORAGE_KEY = "nirbhar-audit-entries";
type SeverityFilter = "all" | IncidentStatus | "unclassified";
type SortMode = "newest" | "oldest" | "actor" | "action";

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp));
}

function mergeEntries(entries: AuditEntry[]) {
  const uniqueEntries = entries.filter((entry, index, collection) =>
    collection.findIndex((candidate) =>
      candidate.timestamp === entry.timestamp &&
      candidate.incident_id === entry.incident_id &&
      candidate.action === entry.action,
    ) === index,
  );
  return uniqueEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function getOutcome(entry: AuditEntry) {
  if (entry.outcome) return entry.outcome;
  if (entry.action === "reject") return "No response ticket created";
  if (entry.action === "approve" || entry.action === "modify") {
    return entry.ticket_id ? `Ticket ${entry.ticket_id} created` : "Response ticket created";
  }
  if (entry.action === "evidence_submitted") return "Evidence recorded";
  if (entry.action === "incident_created") return "Incident assembled";
  return "Recorded";
}

function getSeverity(entry: AuditEntry): SeverityFilter {
  return entry.severity ?? "unclassified";
}

export default function AuditView({ initialEntries }: { initialEntries: AuditEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    let isCurrent = true;
    let localEntries: AuditEntry[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) localEntries = parsed as AuditEntry[];
    } catch {
      localEntries = [];
    }
    getAudit().then((freshEntries) => {
      if (isCurrent) setEntries(mergeEntries([...freshEntries, ...localEntries]));
    }).catch(() => {
      if (isCurrent) setEntries(mergeEntries([...initialEntries, ...localEntries]));
    });
    return () => {
      isCurrent = false;
    };
  }, [initialEntries]);

  const filteredEntries = entries.filter((entry) => {
    const searchText = `${entry.timestamp} ${entry.incident_id} ${entry.actor} ${entry.action} ${entry.detail} ${getOutcome(entry)}`.toLowerCase();
    return (!search.trim() || searchText.includes(search.trim().toLowerCase())) &&
      (severity === "all" || getSeverity(entry) === severity);
  }).sort((a, b) => {
    if (sortMode === "oldest") return a.timestamp.localeCompare(b.timestamp);
    if (sortMode === "actor") return a.actor.localeCompare(b.actor);
    if (sortMode === "action") return a.action.localeCompare(b.action);
    return b.timestamp.localeCompare(a.timestamp);
  });

  return (
    <section className="audit-workspace" aria-label="Chronological audit entries">
      <div className="audit-toolbar">
        <label className="audit-search"><span className="visually-hidden">Search audit records</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search actor, incident, action…" /></label>
        <label className="audit-filter"><span>Severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value as SeverityFilter)}><option value="all">All severities</option><option value="critical_review">Critical review</option><option value="high_priority">High priority</option><option value="attention">Attention</option><option value="normal">Normal</option><option value="unclassified">Unclassified</option></select></label>
        <label className="audit-filter"><span>Sort</span><select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="actor">Actor</option><option value="action">Action</option></select></label>
      </div>
      <div className="audit-results-meta" aria-live="polite">Showing {filteredEntries.length} of {entries.length} records · immutable history</div>
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead><tr><th scope="col">Timestamp</th><th scope="col">Incident</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Outcome</th><th scope="col"><span className="visually-hidden">Details</span></th></tr></thead>
          <tbody>
            {filteredEntries.length ? filteredEntries.map((entry) => (
              <tr key={`${entry.timestamp}-${entry.incident_id}-${entry.action}`}>
                <td><time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time><span className={`audit-severity severity-${getSeverity(entry)}`}><i />{getSeverity(entry) === "unclassified" ? "Unclassified" : getSeverity(entry).replaceAll("_", " ")}</span></td>
                <td><code>{entry.incident_id}</code></td>
                <td>{entry.actor}</td>
                <td className="audit-action">{entry.action.replaceAll("_", " ")}</td>
                <td><span className={`audit-outcome ${entry.action === "reject" ? "outcome-rejected" : ""}`}>{getOutcome(entry)}</span></td>
                <td><details className="audit-expand"><summary aria-label={`Expand ${entry.action} record for ${entry.incident_id}`}>View</summary><div><strong>Record detail</strong><p>{entry.detail || "No additional detail supplied."}</p><span>Actor: {entry.actor}</span>{entry.ticket_id && <span>Ticket: {entry.ticket_id}</span>}</div></details></td>
              </tr>
            )) : <tr><td className="audit-empty-cell" colSpan={6}><strong>No matching records</strong><span>Adjust the search or severity filter.</span></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}