import { useState } from "react";
import type { AskRow } from "../../../../assessment/reportModel";
import { FACT_STATE_LABEL, ROW_ICON } from "../../../../assessment/reportModel";
import { FeedbackButtons } from "../FeedbackButtons";
import { MethodPill } from "../MethodPill";

/** Ask: one test row per fact the client was holding. Clicking a row shows expected against actual. */
export function AskBody({ rows, caseId, onChat }: { rows: AskRow[]; caseId: string; onChat?: (index: number) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
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
          <FeedbackButtons caseId={caseId} item={`ask:${row.fact.id}`} />
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
  );
}
