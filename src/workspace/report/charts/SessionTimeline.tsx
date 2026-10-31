import { EVENT_LABEL } from "@/workspace/report/reportCharts";
import type { EventKind, SessionTimeline as Timeline } from "@/workspace/report/reportCharts";
import { ChartFrame } from "./StackedBar";

const KINDS: EventKind[] = ["question", "fact", "wrote"];
/** Three marks, so three shapes as well as three hues: identity never rests on colour alone. */
const SHAPE: Record<EventKind, string> = { question: "●", fact: "◆", wrote: "▲" };
const ROW: Record<EventKind, number> = { question: 0, fact: 1, wrote: 2 };

const minutes = (ms: number) => Math.round(ms / 60000);

/**
 * The shape of the session: when questions were asked, when facts came out, and when items were
 * written, on one time axis. Shows at a glance whether the interview or the writing took the time,
 * and how late the first fact landed.
 */
export function SessionTimeline({ timeline, empty }: { timeline: Timeline; empty: string }) {
  const { marks, durationMs } = timeline;
  if (!marks.length) return <ChartFrame title="The shape of your session">{<p className="chart-empty">{empty}</p>}</ChartFrame>;

  const width = 720;
  const height = 110;
  const left = 96;
  const right = 16;
  const span = Math.max(durationMs, 60_000);
  const x = (atMs: number) => left + (atMs / span) * (width - left - right);
  const y = (kind: EventKind) => 22 + ROW[kind] * 28;
  const ticks = Array.from({ length: Math.min(7, minutes(span) + 1) }, (_, index) => (index * span) / Math.min(6, Math.max(1, minutes(span))));

  return (
    <ChartFrame title="The shape of your session">
      <svg className="timeline-chart" viewBox={`0 0 ${width} ${height}`} role="img" preserveAspectRatio="xMidYMid meet">
        <title>
          {`${marks.filter((m) => m.kind === "question").length} questions, ${marks.filter((m) => m.kind === "fact").length} facts and ` +
            `${marks.filter((m) => m.kind === "wrote").length} items written over ${minutes(durationMs)} minutes.`}
        </title>
        {ticks.map((tick) => (
          <line key={tick} x1={x(tick)} x2={x(tick)} y1={12} y2={height - 20} className="timeline-grid" />
        ))}
        {KINDS.map((kind) => (
          <g key={kind}>
            <text x={left - 8} y={y(kind) + 4} className="timeline-row-label" textAnchor="end">
              {EVENT_LABEL[kind]}
            </text>
            <line x1={left} x2={width - right} y1={y(kind)} y2={y(kind)} className="timeline-rule" />
            {marks
              .filter((mark) => mark.kind === kind)
              .map((mark, index) => (
                <text key={`${mark.label}-${index}`} x={x(mark.atMs)} y={y(kind) + 5} className={`timeline-mark kind-${kind}`} textAnchor="middle">
                  {SHAPE[kind]}
                  <title>{`${mark.label} at ${minutes(mark.atMs)} min`}</title>
                </text>
              ))}
          </g>
        ))}
        {ticks.map((tick) => (
          <text key={`label-${tick}`} x={x(tick)} y={height - 6} className="timeline-tick" textAnchor="middle">
            {minutes(tick)}m
          </text>
        ))}
      </svg>
      <ul className="chart-legend">
        {KINDS.map((kind) => (
          <li key={kind}>
            <span className={`legend-shape kind-${kind}`} aria-hidden="true">
              {SHAPE[kind]}
            </span>
            {EVENT_LABEL[kind]} ({marks.filter((mark) => mark.kind === kind).length})
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
