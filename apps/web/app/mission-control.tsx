"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getAudit, getIncidents, submitEvidence } from "@/lib/api";
import type { AuditEntry, Incident, IncidentStatus } from "@/types/api";
import DecisionControls from "./incidents/[id]/decision-controls";
import HistoricalHeatmap from "./historical-heatmap";
import UnavailableSourceBadges from "./unavailable-source-badges";

const rooms = [
  { name: "Block C Electrical Room", zone: "block-c-electrical-room", short: "BLK-C / ELEC" },
  { name: "Lab 2", zone: "lab-2", short: "SCIENCE / 02" },
  { name: "Classroom 3", zone: "classroom-3", short: "ACADEMIC / 03" },
];

const statusLabels: Record<IncidentStatus, string> = {
  normal: "Normal",
  attention: "Attention",
  high_priority: "High priority",
  critical_review: "Critical review",
};

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NEXT_PUBLIC_USE_MOCKS === "true";

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

function signalPoints(incident: Incident | undefined) {
  const count = Math.min(incident?.evidence.length ?? 0, 6);
  return Array.from({ length: 7 }, (_, index) => {
    const x = index * (100 / 6);
    const level = Math.max(0, count - (6 - index));
    const y = 34 - Math.min(level * 6, 27);
    return `${x},${y}`;
  }).join(" ");
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return (
    <motion.article className={`metric-card metric-${tone}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <span className="metric-label">{label}</span>
      <motion.strong key={value} className="metric-value" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>{value.toString().padStart(2, "0")}</motion.strong>
      <span className="metric-detail">{detail}</span>
    </motion.article>
  );
}

export default function MissionControl() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [selectedRoomZone, setSelectedRoomZone] = useState<string | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function refreshIncidents() {
      setIsRefreshing(true);
      setError(null);
      try {
        const [currentIncidents, currentActivity] = await Promise.all([
          getIncidents(),
          getAudit().catch(() => []),
        ]);
        if (!isCurrent) return;
        setIncidents(currentIncidents);
        setActivity(currentActivity.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8));
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
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      isCurrent = false;
      window.clearInterval(interval);
      window.clearInterval(clock);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshVersion]);

  useEffect(() => {
    if (!selectedRoomZone) return;
    const drawer = drawerRef.current;
    const controls = drawer?.querySelectorAll<HTMLElement>("button, a, input, textarea, select, [tabindex]:not([tabindex='-1'])") ?? [];
    controls[0]?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedRoomZone(null);
    }
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
    window.addEventListener("keydown", closeOnEscape);
    drawer?.addEventListener("keydown", keepFocusInside);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      drawer?.removeEventListener("keydown", keepFocusInside);
      window.requestAnimationFrame(() => drawerTriggerRef.current?.focus());
    };
  }, [selectedRoomZone]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeIncidents = incidents.filter((incident) => incident.status !== "normal");
  const signalsInReview = incidents.reduce((total, incident) => total + incident.evidence.length, 0);
  const selectedRoom = rooms.find((room) => room.zone === selectedRoomZone);
  const selectedIncident = incidents
    .filter((incident) => incident.zone === selectedRoomZone)
    .sort((a, b) => (latestEvidence(b)?.timestamp ?? "").localeCompare(latestEvidence(a)?.timestamp ?? ""))[0];

  async function simulateIncident() {
    setIsSimulating(true);
    setToast(null);
    try {
      await submitEvidence({
        type: "student_report",
        description: "Demo simulation: unusual electrical odor reported near the east-side workbench.",
        location: "Classroom 3",
        timestamp: new Date().toISOString(),
      });
      setSelectedRoomZone("classroom-3");
      setToast("Demo signal submitted. Refreshing the current room assessment for officer review.");
      setRefreshVersion((version) => version + 1);
    } catch (simulationError) {
      setToast(simulationError instanceof Error ? simulationError.message : "Simulation could not be submitted.");
    } finally {
      setIsSimulating(false);
    }
  }

  const timeLabel = now ? new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now) : "--:--:--";

  return (
    <div className="review-shell mission-shell">
      <header className="review-topbar mission-nav">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>NIRBHAR</span>
          <span className="brand-divider" />
          <span className="brand-subtitle">CAMPUS SAFETY</span>
        </Link>
        <nav className="review-nav" aria-label="Primary navigation">
          <Link className="active" href="/">Command Center</Link>
          <Link href="/evidence">Evidence</Link>
          <Link href="/audit">Audit</Link>
        </nav>
      </header>

      <motion.main className="mission-main" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <section className="mission-statusbar" aria-label="System status">
          <div className="statusbar-system">
            <span className={`health-pulse ${error ? "health-error" : ""}`} />
            <span>{error ? "FEED INTERRUPTED" : hasLoaded ? (demoMode ? "DEMO FEED CONNECTED" : "DATA FEED CONNECTED") : "CONNECTING FEED"}</span>
            <time className="mono-data" aria-label="Campus local time">{timeLabel} IST</time>
          </div>
          <span className="human-review-badge"><span aria-hidden="true">●</span> HUMAN REVIEW REQUIRED</span>
        </section>

        <header className="mission-heading">
          <div>
            <p className="eyebrow">OPERATIONS / ASYNC&apos;26</p>
            <h1>Campus Command Center</h1>
            <p className="intro-copy">Evidence-led room monitoring for authorized officer review.</p>
          </div>
          <div className="mission-actions">
            <span className="update-label">{lastUpdated ? `SYNC ${formatTimestamp(lastUpdated)}` : "AWAITING FIRST SYNC"}</span>
            <button className="refresh-button" type="button" onClick={() => setRefreshVersion((version) => version + 1)} disabled={isRefreshing}>
              <span aria-hidden="true">↻</span> {isRefreshing ? "Syncing" : "Refresh incidents"}
            </button>
            {demoMode && (
              <button className="simulate-button" type="button" onClick={() => void simulateIncident()} disabled={isSimulating}>
                {isSimulating ? "Submitting demo signal…" : "Simulate incident"}
              </button>
            )}
          </div>
        </header>

        {error && <div className="mission-error" role="alert"><strong>Incident feed unavailable</strong><span>{error}</span></div>}

        <section className="metrics-grid" aria-label="Current monitoring summary">
          <Metric label="Active incidents" value={activeIncidents.length} detail="awaiting officer review" tone="amber" />
          <Metric label="Signals in review" value={signalsInReview} detail="across current incidents" tone="cyan" />
          <Metric label="Rooms tracked" value={rooms.length} detail="device heartbeat not provided" tone="blue" />
          <article className="metric-card metric-health">
            <span className="metric-label">System health</span>
            <strong className="health-value"><span className={`health-pulse ${error ? "health-error" : ""}`} />{error ? "Degraded" : hasLoaded ? "Connected" : "Connecting"}</strong>
            <span className="metric-detail">{demoMode ? "Seeded demo data" : "Incident endpoint"}</span>
          </article>
        </section>

        <div className="mission-grid">
          <section className="rooms-section" aria-labelledby="rooms-title">
            <div className="section-heading">
              <div><p className="panel-kicker">CAMPUS / 03 ZONES</p><h2 id="rooms-title">Room status</h2></div>
              <span className="section-meta">{isRefreshing ? "SYNCING" : hasLoaded ? "LIVE SNAPSHOT" : "INITIALIZING"}</span>
            </div>
            {!hasLoaded && !error ? (
              <div className="room-grid" aria-label="Loading room status" aria-busy="true">
                {rooms.map((room) => <div className="room-skeleton" key={room.zone}><span /><span /><span /></div>)}
              </div>
            ) : !hasLoaded && error ? (
              <div className="mission-empty"><strong>Room data is unavailable</strong><p>Retry the incident feed to load current room status.</p><button type="button" className="refresh-button" onClick={() => setRefreshVersion((version) => version + 1)}>Retry feed</button></div>
            ) : (
              <div className="room-grid">
                {rooms.map((room, index) => {
                  const incident = incidents.filter((candidate) => candidate.zone === room.zone)
                    .sort((a, b) => (latestEvidence(b)?.timestamp ?? "").localeCompare(latestEvidence(a)?.timestamp ?? ""))[0];
                  const evidence = latestEvidence(incident);
                  const status = incident?.status ?? "normal";
                  const hasUnavailableSources = (incident?.unavailable_sources.length ?? 0) > 0;
                  const statusLabel = status === "normal" && hasUnavailableSources
                    ? "Sources unavailable"
                    : statusLabels[status];
                  return (
                    <motion.button
                      className={`room-card room-card-interactive status-edge-${status}`}
                      key={room.zone}
                      type="button"
                      onClick={(event) => {
                        drawerTriggerRef.current = event.currentTarget;
                        setSelectedRoomZone(room.zone);
                      }}
                      onPointerMove={(event) => {
                        const bounds = event.currentTarget.getBoundingClientRect();
                        event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
                        event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
                      }}
                      aria-label={`Open ${room.name} details. Status: ${statusLabel}.`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.07 }}
                    >
                      <span className="room-card-topline"><span>{room.short}</span><span className={`severity-chip severity-${status}`}><i />{statusLabel}</span></span>
                      <span className="room-card-title">{room.name}</span>
                      <span className="room-status-line"><span className={`status-ring status-ring-${status}`} /><span>{hasUnavailableSources ? "Source data unavailable; verify assessment" : status === "normal" ? "No active signals" : "Officer review pending"}</span></span>
                      {incident && <UnavailableSourceBadges sources={incident.unavailable_sources} />}
                      <svg className="signal-sparkline" viewBox="0 0 100 40" role="img" aria-label={`${incident?.evidence.length ?? 0} evidence signals in sequence`}>
                        <polyline points={signalPoints(incident)} />
                      </svg>
                      <span className="room-facts">
                        <span><small>LAST SIGNAL</small><b>{evidence ? formatTimestamp(evidence.timestamp) : "No evidence"}</b></span>
                        <span><small>IN REVIEW</small><b>{incident?.evidence.length ?? 0} signal{incident?.evidence.length === 1 ? "" : "s"}</b></span>
                      </span>
                      <span className="room-card-footer"><span>{incident ? incident.id : "ROOM / NORMAL"}</span><span className="room-open">Inspect <b aria-hidden="true">↗</b></span></span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="activity-panel" aria-labelledby="activity-title">
            <div className="section-heading">
              <div><p className="panel-kicker">TRACE / RECENT</p><h2 id="activity-title">Live activity</h2></div>
              <Link href="/audit" className="activity-link">Full audit →</Link>
            </div>
            {activity.length ? (
              <ol className="activity-list">
                {activity.slice(0, 6).map((entry, index) => (
                  <motion.li className="activity-item" key={`${entry.timestamp}-${entry.incident_id}-${entry.action}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}>
                    <span className={`activity-dot ${entry.action.includes("reject") ? "activity-dot-amber" : ""}`} />
                    <div><strong>{entry.action.replaceAll("_", " ")}</strong><p>{entry.detail}</p><span className="activity-meta">{formatTimestamp(entry.timestamp)} · {entry.actor}</span></div>
                  </motion.li>
                ))}
              </ol>
            ) : hasLoaded ? (
              <div className="activity-empty"><span className="empty-orbit" /><strong>No recent activity</strong><p>New signals and officer decisions will appear here.</p></div>
            ) : <div className="activity-skeleton"><span /><span /><span /></div>}
          </aside>
        </div>

        <HistoricalHeatmap />

        <div className="human-boundary-banner"><span className="boundary-mark">!</span><p><strong>Recommendation only.</strong> Officer decision required before any response. NIRBHAR does not initiate actions.</p><span className="boundary-lock">HUMAN AUTHORITY</span></div>
      </motion.main>

      <AnimatePresence>
        {selectedRoom && (
          <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRoomZone(null); }}>
            <motion.aside ref={drawerRef} className="room-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}>
              <header className="drawer-header">
                <div><p className="panel-kicker">ROOM RECORD / {selectedRoom.short}</p><h2 id="drawer-title">{selectedRoom.name}</h2></div>
                <button className="drawer-close" type="button" aria-label="Close room details" onClick={() => setSelectedRoomZone(null)}>×</button>
              </header>
              <div className="drawer-body">
                {selectedIncident ? (
                  <>
                    <div className="drawer-incident-meta"><span className={`severity-chip severity-${selectedIncident.status}`}><i />{selectedIncident.status === "normal" && selectedIncident.unavailable_sources.length > 0 ? "Sources unavailable" : statusLabels[selectedIncident.status]}</span><code>{selectedIncident.id}</code></div>
                    <UnavailableSourceBadges sources={selectedIncident.unavailable_sources} />
                    <section className="drawer-section"><div className="section-heading"><h3>Evidence timeline</h3><span>{selectedIncident.evidence.length} signals</span></div>
                      {selectedIncident.evidence.length ? <ol className="drawer-timeline">{[...selectedIncident.evidence].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map((evidence) => <li key={evidence.id}><span className="timeline-dot" /><div><time>{formatTimestamp(evidence.timestamp)}</time><strong>{evidence.type.replaceAll("_", " ")}</strong><p>{evidence.description}</p><small>{evidence.location} · {evidence.id}</small></div></li>)}</ol> : <p className="drawer-empty">No evidence is attached to this incident.</p>}
                    </section>
                    <section className="drawer-section recommendation-box"><p className="panel-kicker">PROPOSED ASSESSMENT</p><h3>Recommendation</h3><p>{selectedIncident.recommendation?.text ?? "No recommendation available. Review the evidence and applicable SOP before deciding."}</p>{typeof selectedIncident.recommendation?.confidence === "number" && <div className="confidence-meter"><div><span>Confidence</span><strong>{Math.round(selectedIncident.recommendation.confidence * 100)}%</strong></div><span className="confidence-track"><i style={{ width: `${selectedIncident.recommendation.confidence * 100}%` }} /></span><small>Uncertainty remains visible to the officer.</small></div>}</section>
                    {selectedIncident.status !== "normal" ? <DecisionControls incidentId={selectedIncident.id} onRecorded={() => setRefreshVersion((version) => version + 1)} /> : <p className="drawer-empty">No action proposal is pending for this room.</p>}
                  </>
                ) : <div className="activity-empty"><span className="empty-orbit" /><strong>Room is in normal status</strong><p>No active incident is associated with this room. No response is required.</p></div>}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <motion.div className="demo-toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{toast}<button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button></motion.div>}</AnimatePresence>
    </div>
  );
}