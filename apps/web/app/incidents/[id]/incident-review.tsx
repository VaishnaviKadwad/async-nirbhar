import Link from "next/link";
import DecisionControls from "./decision-controls";
import type { Evidence, Incident, IncidentStatus } from "@/types/api";

const statusLabels: Record<IncidentStatus, string> = {
  normal: "Normal",
  attention: "Attention",
  high_priority: "High priority",
  critical_review: "Critical review",
};

const evidenceLabels: Record<Evidence["type"], string> = {
  student_report: "Student report",
  guard_report: "Security guard report",
  warden_report: "Warden report",
  sensor_event: "Sensor event",
};

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp));
}

export default function IncidentReview({ incident }: { incident: Incident }) {
  return (
    <div className="review-shell">
      <header className="review-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>NIRBHAR</span>
        </Link>
        <nav className="review-nav" aria-label="Primary navigation">
          <Link href="/">Command Center</Link>
          <Link href="/evidence">Submit evidence</Link>
          <Link href="/audit">Audit log</Link>
        </nav>
      </header>

      <main className="review-main">
        <Link className="back-link" href="/">← Back to Command Center</Link>
        <div className="incident-heading">
          <div>
            <p className="eyebrow">INCIDENT REVIEW / HUMAN DECISION REQUIRED</p>
            <h1>{incident.id}</h1>
            <p className="incident-zone">{incident.zone}</p>
          </div>
          <span className={`status-badge status-${incident.status}`}>
            <span className="status-dot" aria-hidden="true" />
            {statusLabels[incident.status]}
          </span>
        </div>

        <div className="review-grid">
          <section className="review-card evidence-card" aria-labelledby="evidence-title">
            <div className="card-heading">
              <div>
                <p className="panel-kicker">OBSERVED SIGNALS</p>
                <h2 id="evidence-title">Evidence timeline</h2>
              </div>
              <span className="count-label">{incident.evidence.length} signals</span>
            </div>
            {incident.evidence.length > 0 ? (
              <ol className="evidence-timeline">
                {incident.evidence.map((evidence) => (
                  <li key={evidence.id} className="evidence-item">
                    <span className="timeline-marker" aria-hidden="true" />
                    <div className="evidence-item-content">
                      <div className="evidence-meta">
                        <strong>{evidenceLabels[evidence.type]}</strong>
                        <span>{formatTimestamp(evidence.timestamp)}</span>
                      </div>
                      <p>{evidence.description}</p>
                      <span className="evidence-location">{evidence.location} · {evidence.id}</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-state">No evidence is associated with this incident.</p>
            )}
            {incident.correlation_reason && (
              <div className="correlation-note">
                <p className="note-label">WHY THESE SIGNALS WERE CORRELATED</p>
                <p>{incident.correlation_reason}</p>
              </div>
            )}
          </section>

          <section className="review-card citation-card" aria-labelledby="citation-title">
            <div className="card-heading">
              <div>
                <p className="panel-kicker">GOVERNING SOP</p>
                <h2 id="citation-title">Source citation</h2>
              </div>
            </div>
            {incident.citation ? (
              <div className="citation-content">
                <span className="citation-id">{incident.citation.id}</span>
                <h3>{incident.citation.title}</h3>
                <blockquote>&ldquo;{incident.citation.excerpt}&rdquo;</blockquote>
                <p className="citation-note">Exact source excerpt supplied for officer review.</p>
              </div>
            ) : (
              <p className="empty-state">No governing SOP citation is available for this review.</p>
            )}
          </section>

          <section className="review-card recommendation-card" aria-labelledby="recommendation-title">
            <div className="card-heading">
              <div>
                <p className="panel-kicker">PROPOSED ASSESSMENT</p>
                <h2 id="recommendation-title">Recommendation for review</h2>
              </div>
              <span className="human-only-label">Human decision required</span>
            </div>
            {incident.recommendation ? (
              <>
                <p className="recommendation-text">{incident.recommendation.text}</p>
                <div className="confidence-row">
                  <div>
                    <span className="confidence-label">Confidence</span>
                    <strong>{Math.round(incident.recommendation.confidence * 100)}%</strong>
                  </div>
                  <div className="confidence-track" aria-label={`${Math.round(incident.recommendation.confidence * 100)} percent confidence`}>
                    <span style={{ width: `${incident.recommendation.confidence * 100}%` }} />
                  </div>
                </div>
                <div className="change-mind-panel">
                  <p className="note-label">WHAT WOULD CHANGE MY MIND</p>
                  <p>{incident.recommendation.what_would_change_my_mind}</p>
                </div>
              </>
            ) : (
              <p className="empty-state">No recommendation has been generated.</p>
            )}
          </section>

          <DecisionControls incidentId={incident.id} />
        </div>
      </main>
    </div>
  );
}