"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getIncidents } from "@/lib/api";
import type { Incident, IncidentStatus } from "@/types/api";

const rooms = [
  { name: "Block C Electrical Room", zone: "block-c-electrical-room" },
  { name: "Lab 2", zone: "lab-2" },
  { name: "Classroom 3", zone: "classroom-3" },
];

const statusLabels: Record<IncidentStatus, string> = {
  normal: "Normal",
  attention: "Attention",
  high_priority: "High priority",
  critical_review: "Critical review",
};

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp));
}

function latestEvidence(incident: Incident | undefined) {
  if (!incident?.evidence.length) return null;
  return incident.evidence.reduce((latest, evidence) =>
    evidence.timestamp > latest.timestamp ? evidence : latest,
  );
}

export default function CommandCenter() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function refreshIncidents() {
      setIsRefreshing(true);
      setError(null);
      try {
        const currentIncidents = await getIncidents();
        if (!isCurrent) return;
        setIncidents(currentIncidents);
        setHasLoaded(true);
        setLastUpdated(new Date().toISOString());
      } catch (loadError) {
        if (!isCurrent) return;
        setError(loadError instanceof Error ? loadError.message : "Incident list could not be loaded.");
      } finally {
        if (isCurrent) setIsRefreshing(false);
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshIncidents();
    };

    void refreshIncidents();
    const interval = window.setInterval(() => void refreshIncidents(), 30_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      isCurrent = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshVersion]);

  return (
    <div className="review-shell">
      <header className="review-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>NIRBHAR</span>
        </Link>
        <nav className="review-nav" aria-label="Primary navigation">
          <Link className="active" href="/">Command Center</Link>
          <Link href="/evidence">Submit evidence</Link>
          <Link href="/audit">Audit log</Link>
        </nav>
      </header>

      <main className="command-main">
        <div className="command-heading">
          <div>
            <p className="eyebrow">CAMPUS SAFETY / LIVE REVIEW</p>
            <h1>Command Center</h1>
            <p className="intro-copy">Room signals for officer review. Recommendations never authorize action.</p>
          </div>
          <div className="command-tools">
            <span className="refresh-time">
              {lastUpdated ? `Updated ${formatTimestamp(lastUpdated)}` : "Waiting for incident data"}
            </span>
            <button
              className="refresh-button"
              type="button"
              onClick={() => setRefreshVersion((version) => version + 1)}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing…" : "Refresh incidents"}
            </button>
          </div>
        </div>

        {error && <p className="form-message error-message" role="alert">Incident list unavailable: {error}</p>}

        <section className="room-grid" aria-label="Campus room incident status">
          {rooms.map((room) => {
            const incident = incidents
              .filter((candidate) => candidate.zone === room.zone)
              .sort((a, b) => {
                const aLatest = latestEvidence(a)?.timestamp ?? "";
                const bLatest = latestEvidence(b)?.timestamp ?? "";
                return bLatest.localeCompare(aLatest);
              })[0];
            const evidence = latestEvidence(incident);
            const status = incident?.status;
            const statusText = error
              ? "Unavailable"
              : status
                ? statusLabels[status]
                : hasLoaded
                  ? "Normal"
                  : "Loading";
            const roomCard = (
              <>
                <div className="room-card-heading">
                  <div>
                    <p className="panel-kicker">MONITORED ROOM</p>
                    <h2>{room.name}</h2>
                  </div>
                  <span className={`status-badge ${status ? `status-${status}` : "status-normal"}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {statusText}
                  </span>
                </div>
                <dl className="room-facts">
                  <div>
                    <dt>Latest evidence</dt>
                    <dd>{evidence ? formatTimestamp(evidence.timestamp) : hasLoaded && !error ? "No evidence recorded" : "Waiting for data"}</dd>
                  </div>
                  <div>
                    <dt>Signals in review</dt>
                    <dd>{incident ? incident.evidence.length : hasLoaded && !error ? "0" : "—"}</dd>
                  </div>
                </dl>
                <div className="room-card-footer">
                  <span>{incident ? `Current incident ${incident.id}` : "No active incident"}</span>
                  {incident && status !== "normal" && <span aria-hidden="true">Review →</span>}
                </div>
              </>
            );

            return incident && status !== "normal" && !error ? (
              <Link className={`room-card room-card-action status-edge-${status}`} href={`/incidents/${encodeURIComponent(incident.id)}`} key={room.zone}>
                {roomCard}
              </Link>
            ) : (
              <article className="room-card" key={room.zone}>
                {roomCard}
              </article>
            );
          })}
        </section>

        <div className="command-notice">
          <span className="review-indicator" aria-hidden="true" />
          <p>Signals and recommendations support an authorized officer. No response is initiated by this system.</p>
        </div>
      </main>
    </div>
  );
}