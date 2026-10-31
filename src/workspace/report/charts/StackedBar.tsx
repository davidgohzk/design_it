import { TONE_ICON } from "@/workspace/report/reportCharts";
import type { Slice } from "@/workspace/report/reportCharts";

/**
 * One bar split by status, with a legend under it. Colour never carries the meaning on its own: each
 * slice shows its icon and count, and the legend repeats both in words.
 */
export function StackedBar({ title, slices, empty }: { title: string; slices: Slice[]; empty: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  if (!total) return <ChartFrame title={title}>{<p className="chart-empty">{empty}</p>}</ChartFrame>;

  return (
    <ChartFrame title={title}>
      <div className="stacked-bar" role="img" aria-label={`${title}: ${slices.map((s) => `${s.count} ${s.label}`).join(", ")}`}>
        {slices.map((slice) => (
          <span
            key={slice.key}
            className={`stacked-slice tone-${slice.tone}`}
            style={{ flexGrow: slice.count }}
            title={`${slice.count} ${slice.label}`}
          >
            <span className="slice-text">
              {TONE_ICON[slice.tone]} {slice.count}
            </span>
          </span>
        ))}
      </div>
      <ul className="chart-legend">
        {slices.map((slice) => (
          <li key={slice.key}>
            <span className={`legend-swatch tone-${slice.tone}`} aria-hidden="true">
              {TONE_ICON[slice.tone]}
            </span>
            {slice.count} {slice.label}
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}

export function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      {children}
    </figure>
  );
}
