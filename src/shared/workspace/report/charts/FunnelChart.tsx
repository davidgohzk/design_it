import type { FunnelStage } from "../../../../assessment/reportCharts";
import { ChartFrame } from "./StackedBar";

/**
 * Where found facts leak out: one bar per stage, each shorter than the last, with what was lost
 * between them. One series, so no legend — every bar is labelled with its own count.
 */
export function FunnelChart({ stages, empty }: { stages: FunnelStage[]; empty: string }) {
  const top = stages[0]?.count ?? 0;
  if (!top) return <ChartFrame title="Where your facts went">{<p className="chart-empty">{empty}</p>}</ChartFrame>;

  return (
    <ChartFrame title="Where your facts went">
      <ol
        className="funnel"
        role="img"
        aria-label={`Of ${top} facts you found, ${stages.map((stage) => `${stage.count} ${stage.label.toLowerCase()}`).join(", then ")}.`}
      >
        {stages.map((stage, index) => (
          <li key={stage.key}>
            {index > 0 && stage.lost > 0 && <span className="funnel-drop">−{stage.lost} lost here</span>}
            <span className="funnel-label">{stage.label}</span>
            <span className="funnel-track">
              <span className={`funnel-bar ${stage.count === top ? "full" : stage.count === 0 ? "none" : "part"}`} style={{ width: `${(stage.count / top) * 100}%` }} />
              <span className="funnel-count">{stage.count}</span>
            </span>
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}
