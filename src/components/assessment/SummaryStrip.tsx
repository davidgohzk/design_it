import type { CaseDefinition } from "../../cases";
import { summarize } from "../../assessment/summary";
import type { AssessmentResult } from "../../assessment/types";
import { emptyStateNotes } from "./reportData";
import type { ReportSnapshot } from "./reportTypes";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="report-stat">
      <div className="report-stat-value">{value}</div>
      <div className="report-stat-label">{label}</div>
    </div>
  );
}

/** Separate numbers only: there is deliberately no overall score (§7). */
export function SummaryStrip({
  result,
  caseDefinition,
  snapshot,
  template,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  snapshot: ReportSnapshot;
  template: string;
}) {
  const summary = summarize(result, caseDefinition.facts);
  const excluded = summary.excludedFacts.length;
  const notes = emptyStateNotes(snapshot, template);
  return (
    <>
      <div className="report-summary">
        <Stat
          value={`${summary.factsFound.found} / ${summary.factsFound.total}`}
          label={`facts found (on-probe: ${summary.onProbeFound.found} / ${summary.onProbeFound.total})`}
        />
        <Stat
          value={`${summary.carriedThrough.found} / ${summary.carriedThrough.total}`}
          label="facts carried through to the final diagram"
        />
        <Stat
          value={String(summary.unexplainedBoxes)}
          label={summary.unexplainedBoxes === 1 ? "unexplained box" : "unexplained boxes"}
        />
        <Stat
          value={`${summary.expectedAddressed.found} / ${summary.expectedAddressed.total}`}
          label="expected decisions addressed"
        />
      </div>
      {excluded > 0 && (
        <div className="report-note">
          {excluded === 1 ? "1 fact was" : `${excluded} facts were`} excluded: you asked, but the client didn&apos;t
          answer.
        </div>
      )}
      {notes.map((note) => (
        <div key={note} className="report-note report-note-warn">
          {note}
        </div>
      ))}
    </>
  );
}
