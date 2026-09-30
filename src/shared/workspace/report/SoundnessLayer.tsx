import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { CaseDefinition } from "../../../cases";
import type { AssessmentResult, ExpectedDecisionRating, Rating } from "../../../assessment/types";
import { hasSketch } from "../../../designDoc/parse";
import type { ParsedDecision } from "../../../designDoc/parse";
import { linkBareItemIds } from "../../../designDoc/itemRefs";
import { MermaidBlock } from "../../components/MermaidBlock";
import { nodeIdAt } from "../panels/highlight";
import { citationComponents } from "../panels/citationLinks";
import { FeedbackButtons } from "./FeedbackButtons";
import { BoxRef, ItemRef, LayerCell, LayerCols, ReportLayer } from "./ReportLayer";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

const RATING_LABEL: Record<Rating["rating"] | ExpectedDecisionRating["rating"], string> = {
  sound: "sound",
  weak: "weak",
  unsound: "unsound",
  well: "well",
  weakly: "weakly",
  not_addressed: "not addressed",
};

function RatingLine({ rating, caseId, item }: { rating?: Rating; caseId: string; item: string }) {
  if (!rating) return null;
  return (
    <div className="report-doc-rating report-row-main" style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
      <span style={{ flex: 1 }}>
        <span className={`report-rating report-rating-${rating.rating}`}>{RATING_LABEL[rating.rating]}</span>
        <span className="report-rating-reason">{rating.reason}</span>
      </span>
      <FeedbackButtons caseId={caseId} item={item} />
    </div>
  );
}

/**
 * Level 3 (3.1–3.3): does each link make sense? Ratings sit where the engineer acts on them.
 * Two bands: the doc's requirements beside its decisions, then the sketches beside the final diagram.
 */
export function SoundnessLayer({
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
  const { parsed } = snapshot;
  const caseId = caseDefinition.id;
  const byId = (ratings: Rating[]) => new Map(ratings.map((rating) => [rating.id, rating]));
  const requirementRatings = byId(result.soundness.requirements);
  const decisionRatings = byId(result.soundness.decisions);
  const sketchRatings = byId(result.soundness.sketches);
  const components = useMemo(
    () => citationComponents({ onBrief: nav.brief, onChat: nav.chat, onItem: nav.item }),
    [nav],
  );
  const finalNodes = parsed.final.nodes.filter((node) => !node.isActor);
  // The diagram links in this band stay in this band; every other reference goes to the work on the left.
  const showSketch = (decision: ParsedDecision) =>
    nav.soundness.inFinal({
      nodes: decision.sketch?.nodes.map((node) => node.id) ?? [],
      edges: decision.sketch?.edges ?? [],
    });
  const itemText = (text: string) => (
    <ReactMarkdown components={components}>{linkBareItemIds(text) || "*(empty)*"}</ReactMarkdown>
  );

  return (
    <>
      <ReportLayer
        layerId="level-3-doc"
        level="Level 3"
        title="Soundness: requirements and decisions"
        question="Level 2 asks whether each link exists; level 3 asks whether it makes sense."
        method="AI judgment"
      >
        <LayerCols columns={2}>
          <LayerCell title="Requirements" subtitle="3.1 Does each requirement say what the client actually said?">
            <div className="markdown-body">
              {parsed.requirements.length === 0 && <div className="report-note">No requirements.</div>}
              {parsed.requirements.map((item) => (
                <div key={`${item.id}-${item.line}`} id={`report-item-${item.id}`} className="report-doc-item">
                  <span className="simple-id-chip">{item.id}</span> {itemText(item.text)}
                  <RatingLine rating={requirementRatings.get(item.id)} caseId={caseId} item={`requirement:${item.id}`} />
                </div>
              ))}

              <h5 className="report-group-title">Assumptions</h5>
              {parsed.assumptions.length === 0 && <div className="report-note">No assumptions.</div>}
              {parsed.assumptions.map((item) => (
                <div key={`${item.id}-${item.line}`} id={`report-item-${item.id}`} className="report-doc-item">
                  <span className="simple-id-chip simple-id-chip-assumption">{item.id}</span> {itemText(item.text)}
                </div>
              ))}
            </div>
          </LayerCell>

          <LayerCell title="Decisions" subtitle="3.2 Does each decision follow from the requirements it cites?">
            <div className="markdown-body">
              {parsed.decisions.length === 0 && <div className="report-note">No decisions.</div>}
              {parsed.decisions.map((item) => (
                <div key={`${item.id}-${item.line}`} id={`report-item-${item.id}`} className="report-doc-item">
                  <span className="simple-id-chip simple-id-chip-decision">{item.id}</span> {itemText(item.text)}
                  <RatingLine rating={decisionRatings.get(item.id)} caseId={caseId} item={`decision:${item.id}`} />
                </div>
              ))}
            </div>
          </LayerCell>
        </LayerCols>
      </ReportLayer>

      <ReportLayer
        layerId="level-3-diagrams"
        level="Level 3"
        title="Soundness: sketches and final diagram"
        question="Does each sketch draw what its decision says, and does the final diagram put them together?"
        method="AI judgment"
      >
        <LayerCols columns={2}>
          <LayerCell
            title="Sketches"
            subtitle="3.3 Does each sketch do what its decision says? Click a box, or the sketch, to find it in the final diagram."
          >
            <div id="report-sketches">
              {parsed.decisions.length === 0 && <div className="report-note">No decisions.</div>}
              {parsed.decisions.map((item) => (
                <div key={`${item.id}-${item.line}`} className="report-doc-item">
                  {/* The decision's own words, so the sketch can be checked against what it says. */}
                  <div className="markdown-body">
                    <span className="simple-id-chip simple-id-chip-decision">{item.id}</span> {itemText(item.text)}
                  </div>
                  <div className="simple-sketch" id={`report-sketch-${item.id}`}>
                    {hasSketch(item) && !item.sketch?.parseError ? (
                      <div
                        className="report-sketch-clickable"
                        role="button"
                        tabIndex={0}
                        title="Find in the final diagram"
                        onClick={(event) => {
                          // A box on its own, or else everything this sketch draws.
                          const nodeId = nodeIdAt(event.target);
                          if (nodeId) nav.soundness.node(nodeId);
                          else showSketch(item);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          showSketch(item);
                        }}
                      >
                        <MermaidBlock chart={item.sketchCode ?? ""} />
                      </div>
                    ) : (
                      <div className="simple-sketch-empty">{item.sketch?.parseError ?? "No sketch."}</div>
                    )}
                    <RatingLine rating={sketchRatings.get(item.id)} caseId={caseId} item={`sketch:${item.id}`} />
                  </div>
                </div>
              ))}
            </div>
          </LayerCell>

          <LayerCell title="Final diagram" subtitle="Which decision explains each box? Click a box's name to find it.">
            {parsed.final.nodes.length === 0 || parsed.final.parseError ? (
              <div className="report-note">{parsed.final.parseError ?? "No final diagram."}</div>
            ) : (
              <div className="simple-final-diagram" id="report-final">
                <MermaidBlock chart={snapshot.finalCode} naturalSize />
              </div>
            )}
            {finalNodes.length > 0 && (
              <div className="simple-legend" style={{ marginTop: 8 }}>
                {finalNodes.map((node) => (
                  <div key={node.id} id={`report-node-${node.id}`} className="simple-legend-row report-doc-item">
                    <BoxRef node={node.id} onClick={() => nav.soundness.node(node.id)} />
                    <span className="simple-legend-label">{node.label}</span>
                    {(parsed.nodeDecisions[node.id] ?? []).length === 0 ? (
                      <span className="simple-legend-none">no decision explains this box</span>
                    ) : (
                      parsed.nodeDecisions[node.id].map((decisionId) => (
                        <ItemRef key={decisionId} id={decisionId} onClick={nav.item} />
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </LayerCell>
        </LayerCols>
      </ReportLayer>
    </>
  );
}

/** Level 3b: does the design as a whole hold up, against the case's expected decisions? */
export function WholeDesignLayer({
  result,
  caseDefinition,
  nav,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  nav: ReportNav;
}) {
  return (
    <ReportLayer
      layerId="level-3b"
      level="Level 3b"
      title="Whole design"
      question="Does the design as a whole hold up? Checked against the questions any good design for this case must answer."
      method="AI judgment"
    >
      <div className="report-expected-grid">
        {result.soundness.expectedDecisions.map((expected) => {
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
              <FeedbackButtons caseId={caseDefinition.id} item={`expected:${expected.id}`} />
            </div>
          );
        })}
      </div>
    </ReportLayer>
  );
}
