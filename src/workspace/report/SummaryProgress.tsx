import { CircularProgress } from "@mui/material";
import type { ExtraCheck, ExtraProgress, LevelProgress, LevelStatus } from "@/review";
import type { Level } from "@/review/types";
import { summaryProgress } from "./summaryProgressModel";
import type { SummarySectionProgress } from "./summaryProgressModel";

const statusLabel: Record<SummarySectionProgress["status"], string> = {
  waiting: "Waiting", running: "Running", partial: "In progress", done: "Done", skipped: "Unavailable",
};
const stepLabel: Record<LevelStatus, string> = {
  waiting: "Waiting", running: "Running", done: "Done", skipped: "Unavailable",
};

/** The loading view follows the same five sections as the finished summary. */
export function SummaryProgress({
  progress,
  extraProgress,
}: {
  progress: Partial<Record<Level, LevelProgress>>;
  extraProgress: Partial<Record<ExtraCheck, ExtraProgress>>;
}) {
  return <ol className="summary-progress" aria-label="Summary sections" aria-live="polite">
    {summaryProgress(progress, extraProgress).map((section) => <li key={section.key} className={`summary-progress-section ${section.status}`}>
      <div className="summary-progress-heading">
        <span className="summary-progress-icon" aria-hidden="true">{section.status === "running" ? <CircularProgress size={18} /> : section.status === "done" ? "✓" : section.status === "skipped" ? "–" : "○"}</span>
        <div><strong>{section.title}</strong><p>{section.description}</p></div>
        <span className="summary-progress-status">{statusLabel[section.status]}</span>
      </div>
      <ul className="summary-progress-steps">
        {section.steps.map((step) => <li key={step.label}><span>{step.label}</span><span>{stepLabel[step.status]}</span></li>)}
      </ul>
    </li>)}
  </ol>;
}
