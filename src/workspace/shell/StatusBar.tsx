import type { Problem } from "@/designDoc/problems";
import { SEVERITY_ICON, countProblems } from "@/designDoc/problems";
import { countdownLabel } from "./shortcuts";

type StatusBarProps = {
  problems: Problem[];
  msLeft: number | null;
  /** "Saved" once the latest edit has been recorded. */
  saved: boolean;
  onProblems: () => void;
};

/** The status bar at the foot of the page, as in VS Code: problems, time left, save state. */
export function StatusBar({ problems, msLeft, saved, onProblems }: StatusBarProps) {
  const counts = countProblems(problems);
  const left = countdownLabel(msLeft);
  return (
    <footer className="app-statusbar">
      <button type="button" className="status-problems" onClick={onProblems} title="Toggle Problems (Ctrl/Cmd + Shift + M)">
        <span className="status-error">
          {SEVERITY_ICON.error} {counts.errors}
        </span>
        <span className="status-warning">
          {SEVERITY_ICON.warning} {counts.warnings}
        </span>
        <span className="status-info">
          {SEVERITY_ICON.info} {counts.infos}
        </span>
      </button>
      <span className="status-spacer" />
      {left && <span className="status-item">⏱ {left} left</span>}
      <span className="status-item" aria-live="polite">
        {saved ? "✓ Saved" : "… Saving"}
      </span>
    </footer>
  );
}
