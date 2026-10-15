import { Typography } from "@mui/material";
import type { CaseDefinition } from "../../../../cases";
import { FACT_STATE_LABEL, ROW_ICON, traceFrames } from "../../../../assessment/reportModel";
import type { FactTrace } from "../../../../assessment/funnel";
import type { AssessmentResult } from "../../../../assessment/types";
import type { ParsedDesignDoc } from "../../../../designDoc/parse";
import { FeedbackButtons } from "../FeedbackButtons";
import { MethodPill } from "../MethodPill";

type KeepBodyProps = {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  doc: ParsedDesignDoc;
  traces: FactTrace[];
  /** Flashes an R# / D# in the work on the left. */
  onItem?: (id: string) => void;
};

/** Keep: each found fact as a stack trace from the fact to the final diagram, with its break marked. */
export function KeepBody({ result, caseDefinition, doc, traces, onItem }: KeepBodyProps) {
  const { keep } = result;
  const ids = (list: string[]) =>
    list.length === 0 ? (
      "none"
    ) : (
      <>
        {list.map((id, index) => (
          <span key={id}>
            {index > 0 && ", "}
            <button type="button" className="link-button" onClick={() => onItem?.(id)} disabled={!onItem}>
              {id}
            </button>
          </span>
        ))}
      </>
    );

  return (
    <>
      {traces.length === 0 && <Typography variant="body2">No facts were found, so there is nothing to trace.</Typography>}
      {traces.map((trace) => {
        const { frames, brokenAt } = traceFrames(trace, doc);
        const fact = caseDefinition.facts.find((item) => item.id === trace.factId);
        return (
          <div key={trace.factId} className={`stack-trace ${trace.state}`}>
            <div className="stack-trace-title">
              <span aria-label={trace.state}>{trace.state === "carried_through" ? ROW_ICON.pass : ROW_ICON.fail}</span> {fact?.label ?? trace.factId}:{" "}
              {FACT_STATE_LABEL[trace.state]} <MethodPill method="code" />
              <FeedbackButtons caseId={caseDefinition.id} item={`keep:${trace.factId}`} />
            </div>
            <ol className="stack-frames">
              {frames.map((frame, index) => (
                <li key={frame.label + index} className={index === brokenAt ? "broken" : frame.ok ? "ok" : "after-break"}>
                  <span className="frame-at">at</span> <code>{frame.label}</code> <span className="frame-detail">{frame.detail}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
      <ul className="no-origin">
        <li>
          {ROW_ICON[keep.uncitedRequirements.length ? "fail" : "pass"]} Uncited requirements: {ids(keep.uncitedRequirements)}
        </li>
        <li>
          {ROW_ICON[keep.unsupportedDecisions.length ? "fail" : "pass"]} Unsupported decisions: {ids(keep.unsupportedDecisions)}
        </li>
        <li>
          {ROW_ICON[keep.unjustifiedNodes.length ? "fail" : "pass"]} Boxes no decision explains (C3): {keep.unjustifiedNodes.join(", ") || "none"}
        </li>
        <li>
          {ROW_ICON[keep.unexplainedEdges.length ? "fail" : "pass"]} Arrows no decision explains (C4):{" "}
          {keep.unexplainedEdges.map((edge) => `${edge.from} → ${edge.to}`).join(", ") || "none"}
        </li>
        <li>
          Given facts carried into a requirement: {keep.givenCarried.carried} / {keep.givenCarried.total}
        </li>
      </ul>
    </>
  );
}
