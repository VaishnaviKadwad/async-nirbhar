import type { Incident } from "@/types/api";

export default function EvidenceGraph({ incident }: { incident: Incident }) {
  const evidenceSummary = incident.evidence.map((evidence) => evidence.id).join(", ");
  const citationText = incident.citation?.id ?? incident.citation_status ?? "No citation available";
  const recommendationText = incident.recommendation?.text ?? "No recommendation supplied";

  return (
    <section className="review-card evidence-graph-card" aria-labelledby="evidence-graph-title">
      <div className="card-heading">
        <div>
          <p className="panel-kicker">TRACEABLE RELATIONSHIPS</p>
          <h2 id="evidence-graph-title">Evidence graph</h2>
        </div>
        <span className="count-label">{incident.evidence.length + 4} linked records</span>
      </div>
      <ol className="evidence-graph" aria-label="Incident to evidence to SOP to recommendation to officer decision">
        <li className="graph-node graph-incident">
          <span className="graph-node-type">INCIDENT</span>
          <strong>{incident.id}</strong>
          <small>{incident.zone}</small>
        </li>
        <li className="graph-branch">
          <span className="graph-edge-label">SUPPORTED BY</span>
          {incident.evidence.length ? incident.evidence.map((evidence) => (
            <div className="graph-node graph-evidence" key={evidence.id}>
              <span className="graph-node-type">{evidence.type.replaceAll("_", " ")}</span>
              <strong>{evidence.id}</strong>
              <small>{evidence.description}</small>
            </div>
          )) : <div className="graph-node graph-evidence"><span className="graph-node-type">EVIDENCE</span><strong>None associated</strong><small>No evidence currently supports this incident.</small></div>}
          {evidenceSummary && <span className="visually-hidden">Evidence records: {evidenceSummary}</span>}
        </li>
        <li className="graph-node graph-policy">
          <span className="graph-node-type">GOVERNED BY</span>
          <strong>{citationText}</strong>
          <small>{incident.citation?.title ?? "Exact SOP citation unavailable"}</small>
        </li>
        <li className="graph-node graph-recommendation">
          <span className="graph-node-type">PROPOSED ASSESSMENT</span>
          <strong>{incident.recommendation ? "Recommendation supplied" : "No recommendation supplied"}</strong>
          <small>{recommendationText}</small>
        </li>
        <li className="graph-node graph-officer">
          <span className="graph-node-type">HUMAN AUTHORITY</span>
          <strong>Officer decision required</strong>
          <small>No action is initiated by this system.</small>
        </li>
      </ol>
      <p className="graph-caption">Every relationship is grounded in the current incident response; missing upstream data remains explicitly unavailable.</p>
    </section>
  );
}