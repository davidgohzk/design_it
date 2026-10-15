import { useState } from "react";
import type { LevelOutcome } from "../../../assessment/reportModel";
import { OUTCOME_ICON } from "../../../assessment/reportModel";
import type { Level, Suggestion } from "../../../assessment/types";
import { LEVEL_LABEL, LEVEL_QUESTION } from "../../../assessment/types";
import { MethodPill } from "./MethodPill";

type LevelSectionProps = {
  level: Level;
  outcome: LevelOutcome;
  /** The one-line count beside the heading, so a folded section still says something. */
  summary: string;
  /** "What you did": the recap of the engineer's own work. */
  recap: string;
  /** Set when the checks strip was clicked on this level, so it opens whatever its outcome was. */
  openSignal?: number;
  suggestion?: Suggestion;
  children: React.ReactNode;
};

/**
 * One level of the review. Every section reads the same way: what you did, what went right and wrong,
 * and the AI's suggestion. A section whose level failed starts open; one that passed starts folded.
 */
export function LevelSection({ level, outcome, summary, recap, openSignal, suggestion, children }: LevelSectionProps) {
  const [open, setOpen] = useState(outcome === "fail");
  // Adjusting state during render, as React recommends over an effect: a new signal means the checks
  // strip was clicked on this level, so open it even if it had passed and started folded.
  const [seenSignal, setSeenSignal] = useState(openSignal);
  if (openSignal !== seenSignal) {
    setSeenSignal(openSignal);
    if (openSignal) setOpen(true);
  }

  return (
    <section className={`level-section ${outcome}`} id={`level-${level}`}>
      <button type="button" className="level-header" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="check-icon" aria-label={outcome}>
          {OUTCOME_ICON[outcome]}
        </span>
        <strong>{LEVEL_LABEL[level]}</strong>
        <span className="level-question">{LEVEL_QUESTION[level]}</span>
        <span className="level-summary">{summary}</span>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="level-body">
          <div className="level-part">
            <h4>What you did</h4>
            <p className="level-recap">
              {recap} <MethodPill method="code" />
            </p>
          </div>
          <div className="level-part">
            <h4>What went right, what went wrong</h4>
            {children}
          </div>
          <div className="level-part">
            <h4>Suggestion</h4>
            {suggestion ? (
              <p className="level-suggestion">
                {suggestion.text} <MethodPill method="ai_judgment" />
                {suggestion.refs.length > 0 && <span className="level-suggestion-refs">About: {suggestion.refs.join(", ")}</span>}
              </p>
            ) : (
              <p className="level-suggestion none">No advice for this stage.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
