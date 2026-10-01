import type { CaseDefinition } from "../../../cases";
import { summarize } from "../../../assessment/summary";
import type { AssessmentResult } from "../../../assessment/types";
import { FeedbackButtons } from "./FeedbackButtons";
import { FoundSection } from "./FoundSection";
import { RATING_LABEL } from "./reportData";
import { BoxRef, ItemRef, LayerCell, LayerCols, ReportLayer } from "./ReportLayer";
import { Stat } from "./SummaryStrip";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

const ratio = ({ found, total }: { found: number; total: number }) => `${found} / ${total}`;

/**
 * Level 3: does the design as a whole hold up? 3.1 checks what the interview missed against the case's
 * hidden facts; 3.2 checks the final design against the engineer's own requirements; 3.3 against the
 * questions any good design for this case must answer.
 */
export function WholeDesignLayer({
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
  const { requirementsMet, expectedDecisions } = result.soundness;
  const noRequirements = snapshot.parsed.requirements.length === 0;
  const summary = summarize(result, caseDefinition.facts);

  return (
    <ReportLayer
      layerId="level-3"
      level="Level 3"
      title="Overall design"
      question="Does the design as a whole hold up?"
    >
      <LayerCols>
        <LayerCell
          title="3.1 What was missing"
          subtitle="The case's hidden facts: which you found in the chat, missed, or assumed without asking."
          method="AI · verified quotes"
        >
          <div className="report-mini-stats">
            <Stat value={ratio(summary.factsFound)} label="facts found" />
            <Stat value={ratio(summary.onAskFound)} label="on-ask" />
            {summary.onProbeFound.total > 0 && <Stat value={ratio(summary.onProbeFound)} label="on-probe" />}
          </div>
          <FoundSection result={result} caseDefinition={caseDefinition} parsed={snapshot.parsed} nav={nav} />
        </LayerCell>

        <LayerCell
          title="3.2 Does the final design satisfy the requirements?"
          subtitle="Each requirement against the final diagram. Click a box to find it there."
          method="AI judgment"
        >
          {requirementsMet.length === 0 && (
            <div className="report-note">{noRequirements ? "No requirements." : "Not checked in this review."}</div>
          )}
          {requirementsMet.map((item) => (
            <div key={item.id} className="report-row">
              <div className="report-row-main">
                <span className={`report-rating report-rating-${item.rating}`}>{RATING_LABEL[item.rating]}</span>
                <ItemRef id={item.id} onClick={nav.item} withText />
                <div className="report-rating-reason">{item.reason}</div>
                {item.nodeIds.length > 0 && (
                  <div className="report-box-refs">
                    {item.nodeIds.map((nodeId) => (
                      <BoxRef key={nodeId} node={nodeId} onClick={() => nav.node(nodeId)} />
                    ))}
                  </div>
                )}
              </div>
              <FeedbackButtons caseId={caseId} item={`met:${item.id}`} />
            </div>
          ))}
        </LayerCell>

        <LayerCell
          title="3.3 Technical design considerations"
          subtitle="The questions any good design for this case must answer."
          method="AI judgment"
        >
          {expectedDecisions.map((expected) => {
            const question = caseDefinition.expectedDecisions.find((item) => item.id === expected.id)?.question;
            return (
              <div key={expected.id} className="report-row">
                <div className="report-row-main">
                  <span className={`report-rating report-rating-${expected.rating}`}>{RATING_LABEL[expected.rating]}</span>
                  <span className="report-row-title">{question ?? expected.id}</span>
                  <div className="report-rating-reason">{expected.reason}</div>
                  {expected.decisionIds.length > 0 && (
                    <div className="report-ref-list">
                      {expected.decisionIds.map((decisionId) => (
                        <div key={decisionId}>
                          <ItemRef id={decisionId} onClick={nav.item} withText />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <FeedbackButtons caseId={caseId} item={`expected:${expected.id}`} />
              </div>
            );
          })}
        </LayerCell>
      </LayerCols>
    </ReportLayer>
  );
}
