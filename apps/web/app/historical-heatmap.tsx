const days = ["D−6", "D−5", "D−4", "D−3", "D−2", "D−1", "D"];

const history = [
  { room: "Block C Electrical Room", values: [0, 1, 0, 2, 1, 3, 2] },
  { room: "Lab 2", values: [1, 0, 1, 0, 2, 1, 1] },
  { room: "Classroom 3", values: [0, 0, 0, 1, 0, 0, 0] },
];

function intensity(count: number) {
  if (count === 0) return "heat-0";
  if (count === 1) return "heat-1";
  if (count === 2) return "heat-2";
  return "heat-3";
}

export default function HistoricalHeatmap() {
  const totalSignals = history.reduce((sum, row) => sum + row.values.reduce((daySum, count) => daySum + count, 0), 0);

  return (
    <section className="heatmap-panel" aria-labelledby="heatmap-title">
      <header className="heatmap-heading">
        <div><p className="panel-kicker">SEVEN-DAY SAMPLE / SYNTHETIC</p><h2 id="heatmap-title">Historical incident density</h2></div>
        <span className="heatmap-total">{totalSignals} sample signals</span>
      </header>
      <p className="heatmap-disclaimer">Historical synthetic incident density — not predictive risk.</p>
      <div className="heatmap-scroll">
        <table className="heatmap-table">
          <thead><tr><th scope="col">Monitored room</th>{days.map((day) => <th scope="col" key={day}>{day}</th>)}</tr></thead>
          <tbody>{history.map((row) => <tr key={row.room}><th scope="row">{row.room}</th>{row.values.map((count, index) => <td key={`${row.room}-${days[index]}`}><span className={`heat-cell ${intensity(count)}`} title={`${row.room}: ${count} synthetic signal${count === 1 ? "" : "s"}, ${days[index]}`} aria-label={`${row.room}: ${count} synthetic signal${count === 1 ? "" : "s"}, ${days[index]}`}><span>{count || "·"}</span></span></td>)}</tr>)}</tbody>
        </table>
      </div>
      <footer className="heatmap-footer"><span>Sample window: D−6 through D</span><span className="heatmap-legend"><i className="heat-0" />0<i className="heat-1" />1<i className="heat-2" />2<i className="heat-3" />3+</span></footer>
    </section>
  );
}