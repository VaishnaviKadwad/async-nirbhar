import Link from "next/link";
import EvidenceIntakeForm from "../evidence-intake-form";

export const dynamic = "force-dynamic";

export default function EvidencePage() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const campusTime = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const initialTimestamp = `${campusTime.year}-${campusTime.month}-${campusTime.day}T${campusTime.hour}:${campusTime.minute}`;

  return (
    <div className="intake-shell">
      <header className="review-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>NIRBHAR</span>
        </Link>
        <nav className="review-nav" aria-label="Primary navigation">
          <Link href="/">Command Center</Link>
          <Link className="active" href="/evidence">Submit evidence</Link>
          <Link href="/audit">Audit log</Link>
        </nav>
      </header>

      <main className="intake-main">
        <div className="page-heading">
          <p className="eyebrow">FIELD INTAKE / 01</p>
          <h1>Submit an observation</h1>
          <p className="intro-copy">
            Record what was seen, heard, or reported. Each submission is evidence for
            an officer to assess.
          </p>
        </div>

        <div className="intake-layout">
          <section className="form-panel" aria-labelledby="form-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">NEW EVIDENCE</p>
                <h2 id="form-title">Observation details</h2>
              </div>
              <span className="required-note">* Required</span>
            </div>
            <EvidenceIntakeForm initialTimestamp={initialTimestamp} />
          </section>

          <aside className="intake-aside" aria-label="Submission information">
            <div className="aside-rule" />
            <p className="aside-label">WHAT HAPPENS NEXT</p>
            <h2>Evidence first.<br />Human judgment always.</h2>
            <p className="aside-copy">
              Reports may be correlated with other evidence for officer review. A
              submission by itself does not establish an incident.
            </p>
            <dl className="protocol-list">
              <div><dt>Submitted to</dt><dd>Evidence intake</dd></div>
              <div><dt>Response authority</dt><dd>Campus officer</dd></div>
              <div><dt>Endpoint</dt><dd><code>POST /evidence</code></dd></div>
            </dl>
            <div className="human-review-note">
              <span className="review-indicator" aria-hidden="true" />
              <p>Every proposed action waits for a human decision.</p>
            </div>
          </aside>
        </div>
      </main>
      <footer className="page-footer">
        <span>ASYNC&apos;26 · MSRIT</span>
        <span>LOCAL-FIRST DECISION SUPPORT</span>
      </footer>
    </div>
  );
}