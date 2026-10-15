import type { TagRow } from "../../../../assessment/reportCharts";
import { ChartFrame } from "./StackedBar";

/** How the engineer asked: one bar per tag, biggest first. Magnitude, so one hue throughout. */
export function TagBars({ rows, empty }: { rows: TagRow[]; empty: string }) {
  const top = rows[0]?.count ?? 0;
  if (!top) return <ChartFrame title="How you asked">{<p className="chart-empty">{empty}</p>}</ChartFrame>;

  return (
    <ChartFrame title="How you asked">
      <ul className="tag-bars" role="img" aria-label={`Question styles: ${rows.map((row) => `${row.count} ${row.label}`).join(", ")}.`}>
        {rows.map((row) => (
          <li key={row.tag}>
            <span className="tag-bar-label">{row.label}</span>
            <span className="tag-bar-track">
              <span className="tag-bar" style={{ width: `${(row.count / top) * 100}%` }} />
            </span>
            <span className="tag-bar-count">{row.count}</span>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
