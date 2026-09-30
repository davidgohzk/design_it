import type { CaseDefinition } from "../../../cases";
import { sessionCompletion } from "../../../assessment/session";
import type { AssessmentResult } from "../../../assessment/types";
import { FeedbackButtons } from "./FeedbackButtons";
import { ChatRef, CheckRow, LayerCell, LayerCols, ReportLayer } from "./ReportLayer";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

/** Level 0: was the session fair? Checked before scoring. */
export function FairnessLayer({
  result,
  caseDefinition,
  snapshot,
  nav,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  snapshot: ReportSnapshot;
  nav: ReportNav;
}) {
  const caseId = caseDefinition.id;
  const failed = result.found.facts.filter((fact) => fact.state === "client_failed");
  const factOf = (factId: string) => caseDefinition.facts.find((fact) => fact.id === factId);
  const session = sessionCompletion(snapshot.messages);

  return (
    <ReportLayer
      layerId="level-0"
      level="Level 0"
      title="AI correctness"
      question="Did the client behave correctly in this session?"
    >
      <LayerCols>
        <LayerCell
          title="Client failure"
          subtitle="You asked about these, but the client didn't give them. They're left out of your scores, not counted as missed."
          method="AI · verified quotes"
        >
          {failed.length === 0 && <div className="report-list-empty">✓ None: every fact you asked about came up.</div>}
          {failed.map((found) => {
            const fact = factOf(found.factId);
            return (
              <div key={found.factId} className="report-row">
                <div className="report-row-main">
                  <span className="report-row-title">{fact?.label ?? found.factId}</span>
                  {fact && <span className="report-chip">{fact.disclosure}</span>}
                  {fact && <div className="report-row-detail">{fact.detail}</div>}
                  {found.messageIndex !== undefined && (
                    <div className="report-quote">
                      You asked: “{found.quote}” <ChatRef index={found.messageIndex} quote={found.quote} onChat={nav.chat} />
                    </div>
                  )}
                </div>
                <FeedbackButtons caseId={caseId} item={`found:${found.factId}`} />
              </div>
            );
          })}
        </LayerCell>

        <LayerCell
          title="Invented facts"
          subtitle="Things the client said that match no case fact. The answer key may be incomplete for this session."
          method="AI · verified quotes"
        >
          {result.fairness.inventedStatements.length === 0 && (
            <div className="report-list-empty">✓ None: the client stayed within the case facts.</div>
          )}
          {result.fairness.inventedStatements.map((statement) => (
            <div key={`${statement.messageIndex}:${statement.quote}`} className="report-row">
              <div className="report-row-main report-quote">
                “{statement.quote}” <ChatRef index={statement.messageIndex} quote={statement.quote} onChat={nav.chat} />
              </div>
              <FeedbackButtons caseId={caseId} item={`invented:${statement.messageIndex}:${statement.quote}`} />
            </div>
          ))}
        </LayerCell>

        <LayerCell title="Session completed" subtitle="Timeouts or crashes make scores meaningless." method="Code · log check">
          <CheckRow
            label={session.completed ? "Every client reply arrived" : `${session.failedReplies.length} client ${session.failedReplies.length === 1 ? "reply" : "replies"} failed`}
            state={session.completed ? "pass" : "fail"}
          />
          {session.failedReplies.map((index) => (
            <div key={index} className="report-row">
              <div className="report-row-main report-quote">
                “{snapshot.messages[index].content.trim() || "(empty reply)"}” <ChatRef index={index} onChat={nav.chat} />
              </div>
            </div>
          ))}
        </LayerCell>
      </LayerCols>
    </ReportLayer>
  );
}
