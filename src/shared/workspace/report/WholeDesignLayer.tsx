import type { CaseDefinition } from "../../../cases";
import type { AssessmentResult, CritiquePoint } from "../../../assessment/types";
import { FeedbackButtons } from "./FeedbackButtons";
import { RATING_LABEL } from "./reportData";
import { BoxRef, ItemRef, LayerCell, LayerCols, ReportLayer, ReportSection } from "./ReportLayer";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

const CRITIQUE_COLUMNS = [
  { kind: "strengths", title: "What's good", empty: "Nothing stood out." },
  { kind: "weaknesses", title: "What's not so good", empty: "Nothing stood out." },
  { kind: "improvements", title: "What to improve", empty: "No suggestions." },
] as const;

/**
 * Does the design as a whole hold up? The AI's critique of the implementation comes first: a verdict,
 * what is good, what is not, what to improve. Below it, the final design against the engineer's own
 * requirements, and against the questions any good design for this case must answer.
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
  const { requirementsMet, expectedDecisions, overall } = result.soundness;
  const { parsed } = snapshot;
  const noRequirements = parsed.requirements.length === 0;
  const itemIds = new Set([...parsed.requirements, ...parsed.assumptions, ...parsed.decisions].map((item) => item.id));

  /** An R#, A# or D# id opens the item; anything else is a box in the final diagram. */
  const ref = (id: string) =>
    itemIds.has(id) ? (
      <ItemRef key={id} id={id} onClick={nav.item} />
    ) : (
      <BoxRef key={id} node={id} onClick={() => nav.node(id)} />
    );

  const point = (kind: string, item: CritiquePoint, index: number) => (
    <div key={index} className="report-row">
      <div className="report-row-main">
        <span className="report-row-title">{item.point}</span>
        {item.refs.length > 0 && <div className="report-box-refs">{item.refs.map(ref)}</div>}
      </div>
      <FeedbackButtons caseId={caseId} item={`overall:${kind}:${index}`} />
    </div>
  );

  return (
    <ReportLayer layerId="overall" title="Overall design" question="Is the implementation good as a whole?">
      <ReportSection
        sectionId="overall-critique"
        title="Critique"
        question="A senior reviewer's read of the whole design: what works, what doesn't, and what to do next."
        method="AI judgment"
      >
        {overall ? (
          <>
            <p className="report-critique-summary">{overall.summary}</p>
            <LayerCols>
              {CRITIQUE_COLUMNS.map(({ kind, title, empty }) => (
                <LayerCell key={kind} title={title}>
                  {overall[kind].length === 0 && <div className="report-list-empty">{empty}</div>}
                  {overall[kind].map((item, index) => point(kind, item, index))}
                </LayerCell>
              ))}
            </LayerCols>
          </>
        ) : (
          <div className="report-note">This review has no overall critique yet. Run it again to get one.</div>
        )}
      </ReportSection>

      <ReportSection
        sectionId="overall-checks"
        title="Requirements and design considerations"
        question="The final design against your own requirements, and against the questions any good design for this case must answer."
      >
        <LayerCols columns={2}>
          <LayerCell
            title="Requirements met by the final design"
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
            title="Technical design considerations"
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
      </ReportSection>
    </ReportLayer>
  );
}
