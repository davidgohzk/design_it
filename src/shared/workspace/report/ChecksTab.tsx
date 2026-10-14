import { useState } from "react";
import { Typography } from "@mui/material";
import type { CaseDefinition } from "../../../cases";
import {
  FACT_STATE_LABEL,
  OUTCOME_ICON,
  ROW_ICON,
  askRows,
  levelOutcomes,
  orderedTraces,
  summaryLine,
  traceFrames,
} from "../../../assessment/reportModel";
import type { AssessmentResult, Level, SessionMode } from "../../../assessment/types";
import { LEVEL_LABEL, LEVEL_QUESTION } from "../../../assessment/types";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import { FeedbackButtons } from "./FeedbackButtons";
import { MethodPill } from "./MethodPill";

type ChecksTabProps = {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  doc: ParsedDesignDoc;
  mode: SessionMode;
  /** Admin view in research mode also sees the Gate details. */
  showGateDetails: boolean;
  onChat?: (index: number) => void;
};

function Job({ level, outcome, summary, children }: { level: Level; outcome: string; summary: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(outcome !== "pass");
  return (
    <section className={`check-job ${outcome}`} id={`check-${level}`}>
      <button type="button" className="check-job-header" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="check-icon" aria-label={outcome}>
          {OUTCOME_ICON[outcome as keyof typeof OUTCOME_ICON]}
        </span>
        <strong>{LEVEL_LABEL[level]}</strong>
        <span className="check-job-question">{LEVEL_QUESTION[level]}</span>
        <span className="check-job-summary">{summary}</span>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="check-job-body">{children}</div>}
    </section>
  );
}

/** The code checks, shown like a CI test report: one job per level, one row per fact. */
export function ChecksTab({ result, caseDefinition, doc, mode, showGateDetails, onChat }: ChecksTabProps) {
  const outcomes = levelOutcomes(result);
  const rows = askRows(result, caseDefinition, mode);
  const [expanded, setExpanded] = useState<string | null>(null);
  const traces = orderedTraces(result, mode);
  const { keep, gate } = result;

  return (
    <div className="checks-tab">
      {showGateDetails && (
        <Job level="gate" outcome={outcomes.gate} summary={gate.sessionComplete ? "session complete" : "session not complete"}>
          <ul className="test-rows">
            <li>
              {ROW_ICON[gate.clientFailed.length ? "skipped" : "pass"]} Client failures: {gate.clientFailed.length}{" "}
              {gate.clientFailed.map((failure) => `${failure.factId} (Chat #${failure.messageIndex})`).join(", ")} <MethodPill method="code" />
            </li>
            <li>
              {ROW_ICON[gate.leaks.length ? "warn" : "pass"]} Leaks: {gate.leaks.length}; phantoms: {gate.phantoms.length}{" "}
              {[...gate.leaks, ...gate.phantoms].map((item) => `${item.factId} (#${item.messageIndex})`).join(", ")}
            </li>
            <li>
              {ROW_ICON[gate.inventedSpecifics.length ? "warn" : "pass"]} Invented specifics, for a human to audit:{" "}
              {gate.inventedSpecifics.length ? gate.inventedSpecifics.map((item) => `“${item.text}” (#${item.messageIndex})`).join(", ") : "none"}
            </li>
            <li>
              {ROW_ICON[gate.sessionComplete ? "pass" : "fail"]} Session complete: {gate.sessionComplete ? "yes" : "no"}
              {gate.failedReplies.length ? ` (failed replies: ${gate.failedReplies.map((index) => `#${index}`).join(", ")})` : ""}
            </li>
          </ul>
        </Job>
      )}

      <Job level="ask" outcome={outcomes.ask} summary={summaryLine(rows)}>
        <ul className="test-rows">
          {rows.map((row) => (
            <li key={row.fact.id} className={`test-row ${row.status}`}>
              <button
                type="button"
                className="test-row-header"
                onClick={() => setExpanded((current) => (current === row.fact.id ? null : row.fact.id))}
                aria-expanded={expanded === row.fact.id}
              >
                <span className="test-icon" aria-label={row.status}>
                  {ROW_ICON[row.status]}
                </span>
                <span className="test-name">
                  {row.fact.label} <span className="test-disclosure">{row.fact.disclosure}</span>
                </span>
                <span className="test-state">{FACT_STATE_LABEL[row.state]}</span>
              </button>
              <MethodPill method={row.method} />
              <FeedbackButtons caseId={caseDefinition.id} item={`ask:${row.fact.id}`} />
              {expanded === row.fact.id && (
                <div className="test-detail">
                  <div>
                    <strong>Expected:</strong> {row.expected}
                  </div>
                  <div>
                    <strong>Actual:</strong> {row.actual}{" "}
                    {row.messageIndex !== undefined && onChat && (
                      <button type="button" className="link-button" onClick={() => onChat(row.messageIndex!)}>
                        Show message
                      </button>
                    )}
                  </div>
                  {row.tryAsking && (
                    <div className="try-asking">
                      <strong>Try asking:</strong> “{row.tryAsking}”
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Job>

      <Job
        level="keep"
        outcome={outcomes.keep}
        summary={`${traces.filter((trace) => trace.state === "carried_through").length} of ${traces.length} found facts carried through`}
      >
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
            {ROW_ICON[keep.uncitedRequirements.length ? "fail" : "pass"]} Uncited requirements:{" "}
            {keep.uncitedRequirements.join(", ") || "none"}
          </li>
          <li>
            {ROW_ICON[keep.unsupportedDecisions.length ? "fail" : "pass"]} Unsupported decisions:{" "}
            {keep.unsupportedDecisions.join(", ") || "none"}
          </li>
          <li>
            {ROW_ICON[keep.unjustifiedNodes.length ? "fail" : "pass"]} Boxes no decision explains (C3):{" "}
            {keep.unjustifiedNodes.join(", ") || "none"}
          </li>
          <li>
            {ROW_ICON[keep.unexplainedEdges.length ? "fail" : "pass"]} Arrows no decision explains (C4):{" "}
            {keep.unexplainedEdges.map((edge) => `${edge.from} → ${edge.to}`).join(", ") || "none"}
          </li>
          <li>
            Given facts carried into a requirement: {keep.givenCarried.carried} / {keep.givenCarried.total}
          </li>
        </ul>
      </Job>
    </div>
  );
}
