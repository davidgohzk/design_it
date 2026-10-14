import { Button, Typography } from "@mui/material";
import { SEVERITY_ICON, countProblems } from "../../../designDoc/problems";
import type { Problem } from "../../../designDoc/problems";

type ProblemsPanelProps = {
  problems: Problem[];
  open: boolean;
  onToggle: () => void;
  /** Jump to the problem's line (and highlight its box, for diagram problems). */
  onSelect: (problem: Problem) => void;
};

/** One list of errors, warnings and info for the doc and the diagram, like VS Code's Problems panel. */
export function ProblemsPanel({ problems, open, onToggle, onSelect }: ProblemsPanelProps) {
  const counts = countProblems(problems);
  return (
    <section className={`problems-panel ${open ? "open" : ""}`} aria-label="Problems">
      <header className="problems-header">
        <Button size="small" onClick={onToggle} aria-expanded={open} title="Toggle Problems (Ctrl/Cmd + Shift + M)">
          {open ? "▾" : "▸"} Problems
        </Button>
        <span className="problems-counts" aria-live="polite">
          <span className="problem-count error" title="Errors">
            {SEVERITY_ICON.error} {counts.errors}
          </span>
          <span className="problem-count warning" title="Warnings">
            {SEVERITY_ICON.warning} {counts.warnings}
          </span>
          <span className="problem-count info" title="Info">
            {SEVERITY_ICON.info} {counts.infos}
          </span>
        </span>
      </header>
      {open && (
        <ul className="problems-list scrollable">
          {problems.length === 0 && (
            <li className="problems-empty">
              <Typography variant="caption">✓ No problems in the doc or the diagram</Typography>
            </li>
          )}
          {problems.map((problem, index) => (
            <li key={`${problem.line}-${problem.rule}-${index}`}>
              <button type="button" className={`problem-row ${problem.severity}`} onClick={() => onSelect(problem)}>
                <span className="problem-icon" aria-label={problem.severity}>
                  {SEVERITY_ICON[problem.severity]}
                </span>
                <span className="problem-message">{problem.message}</span>
                <span className="problem-source">{problem.source === "doc" ? "Doc" : "Diagram"}</span>
                <span className="problem-line">Ln {problem.line}</span>
                {problem.fix && <span className="problem-fix" title="Quick fix: Ctrl/Cmd + .">💡</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
