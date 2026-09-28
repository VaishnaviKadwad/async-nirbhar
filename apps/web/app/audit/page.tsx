import Link from "next/link";
import { getAudit } from "@/lib/api";
import AuditView from "./audit-view";
import type { AuditEntry } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const entries: AuditEntry[] = [...(await getAudit())].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

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
          <Link className="active" href="/audit">Audit log</Link>
        </nav>
      </header>
      <main className="audit-main">
        <Link className="back-link" href="/">← Back to Command Center</Link>
        <div className="audit-heading">
          <div>
            <p className="eyebrow">TRACEABILITY / 03</p>
            <h1>Audit log</h1>
            <p className="intro-copy">Chronological record of evidence correlation and human decisions.</p>
          </div>
          <span className="audit-count">{entries.length} entries</span>
        </div>
        <AuditView initialEntries={entries} />
      </main>
    </div>
  );
}