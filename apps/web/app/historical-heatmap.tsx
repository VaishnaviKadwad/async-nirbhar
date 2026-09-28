import type { Incident } from "@/types/api";

const monitoredZones = [
  { id: "block-c-electrical-room", label: "Block C Electrical Room" },
  { id: "lab-2", label: "Lab 2" },
  { id: "classroom-3", label: "Classroom 3" },
];

function intensity(count: number) {
  if (count === 0) return "heat-0";
  if (count === 1) return "heat-1";
  if (count === 2) return "heat-2";
  return "heat-3";
}

function localDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function HistoricalHeatmap({
  incidents,
  loading,
}: {
  incidents: Incident[];
  loading: boolean;
}) {
  const now = new Date();
  const today = localDateKey(now);
  const todayUtc = new Date(`${today}T00:00:00Z`);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayUtc);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("en-IN", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
      }).format(date),
    };
  });
  const visibleDays = new Set(days.map((day) => day.key));
  const counts = new Map<string, number>();
  for (const incident of incidents) {
    for (const evidence of incident.evidence) {
      if (evidence.synthetic) continue;
      const day = localDateKey(new Date(evidence.timestamp));
      if (!visibleDays.has(day)) continue;
      const key = `${incident.zone}:${day}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const totalSignals = loading ? null : [...counts.values()].reduce((sum, count) => sum + count, 0);

  return (
    <section className="heatmap-panel" aria-labelledby="heatmap-title">
      <header className="heatmap-heading">
        <div><p className="panel-kicker">LAST SEVEN DAYS / RECORDED EVIDENCE</p><h2 id="heatmap-title">Evidence by room</h2></div>
        <span className="heatmap-total">{loading ? "Loading…" : `${totalSignals} recorded signals`}</span>
      </header>
      <p className="heatmap-disclaimer">Counts reflect non-synthetic evidence recorded by this system. This view is descriptive, not predictive.</p>
      <div className="heatmap-scroll">
        <table className="heatmap-table">
          <thead><tr><th scope="col">Monitored room</th>{days.map((day) => <th scope="col" key={day.key}>{day.label}</th>)}</tr></thead>
          <tbody>{monitoredZones.map((zone) => <tr key={zone.id}><th scope="row">{zone.label}</th>{days.map((day) => {
            const count = counts.get(`${zone.id}:${day.key}`) ?? 0;
            return <td key={`${zone.id}-${day.key}`}><span className={`heat-cell ${intensity(loading ? 0 : count)}`} title={loading ? "Loading evidence history" : `${zone.label}: ${count} recorded signal${count === 1 ? "" : "s"}, ${day.label}`} aria-label={loading ? "Loading evidence history" : `${zone.label}: ${count} recorded signal${count === 1 ? "" : "s"}, ${day.label}`}><span>{loading ? "…" : count || "·"}</span></span></td>;
          })}</tr>)}</tbody>
        </table>
      </div>
      <footer className="heatmap-footer"><span>Evidence timestamps shown in Asia/Kolkata</span><span className="heatmap-legend"><i className="heat-0" />0<i className="heat-1" />1<i className="heat-2" />2<i className="heat-3" />3+</span></footer>
    </section>
  );
}
