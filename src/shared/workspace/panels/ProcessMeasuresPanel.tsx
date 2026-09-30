import type { ProcessMeasures } from "../../../assessment/process";

const minutes = (ms: number) => {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

/** Admin view, research mode: how the engineer worked, not how well (§8). */
export function ProcessMeasuresPanel({ measures, discardedQuotes }: { measures: ProcessMeasures; discardedQuotes?: number }) {
  const rows: [string, string][] = [
    ["Questions asked", String(measures.questions)],
    [
      "Time to first surfaced fact",
      measures.timeToFirstSurfacedFactMs === null ? "no fact surfaced (or no review yet)" : minutes(measures.timeToFirstSurfacedFactMs),
    ],
    ["Time on task", minutes(measures.timeOnTaskMs)],
    ["Descriptions sent", String(measures.diagramPrompts)],
    [
      "Final boxes first drawn from a description",
      measures.aiCreatedNodeShare === null ? "no final diagram" : `${Math.round(measures.aiCreatedNodeShare * 100)}%`,
    ],
  ];
  if (discardedQuotes !== undefined) rows.push(["AI quotes discarded by verification", String(discardedQuotes)]);
  return (
    <section>
      <h4 className="report-group-title">Process measures (research)</h4>
      <div className="report-summary">
        {rows.map(([label, value]) => (
          <div key={label} className="report-stat">
            <div className="report-stat-value" style={{ fontSize: "1.1rem" }}>
              {value}
            </div>
            <div className="report-stat-label">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
