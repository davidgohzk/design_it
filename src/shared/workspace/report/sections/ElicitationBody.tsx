import { useState } from "react";
import type { CaseDefinition, CaseFact } from "../../../../cases";
import type { ElicitationResult, Ratio } from "../../../../assessment/elicitation";
import { askRows, FACT_STATE_LABEL } from "../../../../assessment/reportModel";
import type { AskRow } from "../../../../assessment/reportModel";
import type { AssessmentResult, SessionMode } from "../../../../assessment/types";
import { FeedbackButtons } from "../FeedbackButtons";
import { MethodPill } from "../MethodPill";
import { CellEmpty, ChatRef, CheckRow, LayerCell, LayerCols, Stat } from "../ReportLayer";

const percent = (ratio: Ratio) => (ratio.value === null ? "—" : `${Math.round(ratio.value * 100)}%`);

const fraction = (name: string, ratio: Ratio) =>
  name === "TKQR" ? `${ratio.numerator.toFixed(2)} / ${ratio.denominator.toFixed(2)}` : `${ratio.numerator} / ${ratio.denominator}`;

/**
 * The four elicitation measures, each with the fraction behind it and what it counts. A measure with
 * nothing in its denominator says which turns never happened, rather than reading as a measure that
 * could not be taken: never probing is a fact about the interview, not a gap in the review.
 */
export function ElicitationMetrics({ elicitation }: { elicitation: ElicitationResult }) {
  const metrics = [
    { name: "IRE", ratio: elicitation.ire, empty: "this case holds nothing back", description: "Requirements elicited, out of every hidden requirement in the case." },
    { name: "ESR · clarify", ratio: elicitation.clarificationEsr, empty: "you never asked a clarifying question", description: "Clarifying turns that brought out a new requirement." },
    { name: "ESR · probe", ratio: elicitation.probingEsr, empty: "you never probed", description: "Probing turns that brought out a new requirement." },
    { name: "TKQR", ratio: elicitation.tkqr, empty: "you asked no questions", description: "Key questions, discounted by how late they came, against the earliest they could have come." },
  ];
  return (
    <>
      <div className="report-mini-stats">
        {metrics.map(({ name, ratio, empty }) => (
          <Stat key={name} value={percent(ratio)} label={`${name} · ${ratio.denominator ? fraction(name, ratio) : empty}`} />
        ))}
      </div>
      <div className="report-ref-list">
        {metrics.map(({ name, description }) => (
          <div key={name} className="report-row-detail">
            <strong>{name}</strong> {description}
          </div>
        ))}
      </div>
      <div className="report-row-detail">
        TKQR weights questioning turn t by 1/log₂(t + 1). A repeated target earns no new credit; a client failure does not remove
        question credit. <MethodPill method="code" />
      </div>
    </>
  );
}

/** What the engineer did about one requirement: the detail beside the table that selected it. */
function RequirementDetail({ row, caseId, onChat }: { row: AskRow; caseId: string; onChat: (index: number, quote?: string) => void }) {
  return (
    <div className="report-row">
      <div className="report-row-main">
        <span className="report-row-title">{row.fact.label}</span>
        <span className="report-chip">{row.fact.disclosure}</span>
        <dl className="requirement-detail">
          <dt>What the client was holding</dt>
          <dd>{row.fact.detail}</dd>
          <dt>Expected</dt>
          <dd>{row.expected}</dd>
          <dt>What happened</dt>
          <dd>
            {row.actual} {row.messageIndex !== undefined && <ChatRef index={row.messageIndex} onChat={onChat} />}
          </dd>
          {row.tryAsking && (
            <>
              <dt>Try asking</dt>
              <dd>“{row.tryAsking}”</dd>
            </>
          )}
        </dl>
        <div className="report-box-refs">
          <MethodPill method={row.method} />
        </div>
      </div>
      <FeedbackButtons caseId={caseId} item={`ask:${row.fact.id}`} />
    </div>
  );
}

/** The state of one hidden requirement, as the table's middle column shows it. */
function requirementState(fact: CaseFact, result: AssessmentResult, elicited: Set<string>) {
  if (elicited.has(fact.id)) return { label: "elicited", tone: "elicited" };
  if (result.gate.clientFailed.some((item) => item.factId === fact.id)) return { label: "client failed to disclose", tone: "uncertain" };
  const finding = result.ask.facts.find((item) => item.factId === fact.id);
  return { label: finding ? FACT_STATE_LABEL[finding.state] : "missed", tone: "missed" };
}

/**
 * Which hidden requirements came out, as a table of its own, and the detail of whichever row is
 * selected beside it. The first requirement that did not come out is selected, because that is the
 * one worth reading first.
 */
export function RequirementsFoundAndMissed({
  result,
  caseDefinition,
  mode,
  elicited,
  onChat,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  mode: SessionMode;
  elicited: Set<string>;
  onChat: (index: number, quote?: string) => void;
}) {
  const hidden = caseDefinition.facts.filter((fact) => fact.disclosure !== "given");
  const rows = askRows(result, caseDefinition, mode);
  const detailOf = (factId: string) => rows.find((row) => row.fact.id === factId);
  const firstMissed = hidden.find((fact) => !elicited.has(fact.id) && detailOf(fact.id));
  const [selected, setSelected] = useState<string | null>((firstMissed ?? hidden.find((fact) => detailOf(fact.id)))?.id ?? null);
  const selectable = hidden.filter((fact) => detailOf(fact.id));

  const move = (factId: string, step: 1 | -1) => {
    const at = selectable.findIndex((fact) => fact.id === factId);
    const next = selectable[at + step];
    if (next) setSelected(next.id);
  };

  const detail = selected ? detailOf(selected) : undefined;

  return (
    <LayerCols columns={2}>
      <LayerCell
        title="Requirements found and missed"
        subtitle="Every hidden requirement in the case. Pick one to read what happened."
        method="code"
      >
        {hidden.length === 0 && <CellEmpty>This case holds nothing back.</CellEmpty>}
        {hidden.length > 0 && (
          <table className="requirement-table">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Outcome</th>
                <th>Where</th>
              </tr>
            </thead>
            <tbody>
              {hidden.map((fact) => {
                const state = requirementState(fact, result, elicited);
                const row = detailOf(fact.id);
                return (
                  <tr
                    key={fact.id}
                    aria-selected={selected === fact.id}
                    tabIndex={row ? 0 : -1}
                    onClick={() => row && setSelected(fact.id)}
                    onKeyDown={(event) => {
                      if (!row) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(fact.id);
                      }
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        move(fact.id, 1);
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        move(fact.id, -1);
                      }
                    }}
                  >
                    <td>{fact.label}</td>
                    <td>
                      <span className={`report-rating report-rating-${state.tone}`}>{state.label}</span>
                    </td>
                    <td>{row?.messageIndex !== undefined ? <ChatRef index={row.messageIndex} onChat={onChat} /> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </LayerCell>

      <LayerCell title="Requirement detail" subtitle="What was expected of this requirement, and what the interview actually did.">
        {detail ? (
          <RequirementDetail row={detail} caseId={caseDefinition.id} onChat={onChat} />
        ) : (
          <CellEmpty>Pick a requirement on the left to read its detail.</CellEmpty>
        )}
      </LayerCell>
    </LayerCols>
  );
}

/**
 * Every interviewer turn, how it was classified and what it brought out. When the judge could not
 * label the turns the table is not drawn: an unlabelled turn says nothing about the interview, and a
 * table of blanks reads as if the interview had been empty.
 */
export function QuestioningTurns({ elicitation, onChat }: { elicitation: ElicitationResult; onChat: (index: number, quote?: string) => void }) {
  if (elicitation.turns.length === 0) return <CheckRow state="na" label="No interviewer turns were recorded in this session." />;
  if (!elicitation.labelsAvailable) {
    return (
      <CheckRow
        state="na"
        label={`${elicitation.turns.length} interviewer turns, none classified`}
        detail={
          elicitation.labelErrors?.length
            ? `The turns judge did not answer, so clarifying and probing could not be told apart: ${elicitation.labelErrors[0]}`
            : "This review carries no turn classification, so clarifying and probing could not be told apart."
        }
      />
    );
  }
  return (
    <div className="summary-table-scroll">
      <table className="summary-table">
        <thead>
          <tr>
            <th>Turn</th>
            <th>Action</th>
            <th>Targeted</th>
            <th>Newly elicited</th>
            <th>ESR</th>
            <th>TKQR</th>
          </tr>
        </thead>
        <tbody>
          {elicitation.turns.map((turn) => (
            <tr key={`${turn.messageIndex}-${turn.turn}`}>
              <td>{turn.messageIndex < 0 ? "End interview" : <ChatRef index={turn.messageIndex} onChat={onChat} />}</td>
              <td title={turn.reasoning}>
                <span className={`report-rating report-rating-${turn.actionType === "unclassified" ? "unclassified" : "sound"}`}>{turn.actionType}</span>
              </td>
              <td>{turn.targetIds.join(", ") || "—"}</td>
              <td>{turn.newlyElicitedIds.join(", ") || "—"}</td>
              <td>
                {turn.actionType === "clarify" || turn.actionType === "probe"
                  ? turn.effective
                    ? "effective"
                    : "no new requirement"
                  : "—"}
              </td>
              <td>{turn.keyQuestion ? "key question" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
