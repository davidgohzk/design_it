import { CircularProgress, Typography } from "@mui/material";
import type { LevelOutcome } from "../../../assessment/reportModel";
import { OUTCOME_ICON } from "../../../assessment/reportModel";
import type { LevelProgress } from "../../../assessment/run";
import type { Level } from "../../../assessment/types";
import { LEVEL_LABEL, LEVEL_QUESTION, LEVELS } from "../../../assessment/types";

type ChecksRunningProps = {
  progress: Partial<Record<Level, LevelProgress>>;
  /** Once the review is done, each level's ✓ / ✗ / ⊘. */
  outcomes?: Record<Level, LevelOutcome> | null;
  onSelect?: (level: Level) => void;
};

const seconds = (ms?: number) => (ms === undefined ? "" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

/** "Checks running", like the checks on a GitHub pull request: one row per level. */
export function ChecksRunning({ progress, outcomes, onSelect }: ChecksRunningProps) {
  return (
    <ol className="checks-running" aria-label="Checks">
      {LEVELS.map((level) => {
        const step = progress[level];
        const outcome = outcomes?.[level];
        const running = !outcome && step?.status === "running";
        const icon = outcome ? OUTCOME_ICON[outcome] : step?.status === "skipped" ? OUTCOME_ICON.skipped : step?.status === "done" ? "•" : "○";
        return (
          <li key={level} className={`check-row ${outcome ?? step?.status ?? "waiting"}`}>
            <button type="button" className="check-button" onClick={() => onSelect?.(level)} disabled={!onSelect}>
              <span className="check-icon" aria-label={outcome ?? step?.status ?? "waiting"}>
                {running ? <CircularProgress size={14} /> : icon}
              </span>
              <span className="check-name">{LEVEL_LABEL[level]}</span>
              <Typography variant="caption" color="text.secondary" className="check-question">
                {LEVEL_QUESTION[level]}
              </Typography>
              <span className="check-time">{step?.status === "skipped" ? "skipped" : seconds(step?.ms)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
