import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { CaseDefinition } from "../../cases";
import type { AssessmentResult, ExpectedDecisionRating, Rating } from "../../assessment/types";
import { hasSketch } from "../../designDoc/parse";
import { MermaidBlock } from "../MermaidBlock";
import { BadgedDiagram } from "../simple/BadgedDiagram";
import { citationComponents } from "../simple/citationLinks";
import { FeedbackButtons } from "./FeedbackButtons";
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

export function ReasoningSection({
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

  return (
    <div>
      <h4 className="report-group-title">Expected decisions</h4>
      {result.soundness.expectedDecisions.map((expected) => {
        const question = caseDefinition.expectedDecisions.find((item) => item.id === expected.id)?.question;
        return (
          <div key={expected.id} className="report-row">
            <div className="report-row-main">
              <span className={`report-rating report-rating-${expected.rating}`}>{RATING_LABEL[expected.rating]}</span>
              <span className="report-row-title">{question ?? expected.id}</span>
              {expected.decisionIds.map((decisionId) => (
                <button
                  key={decisionId}
                  type="button"
                  className="report-link inline-ref simple-ref-decision"
                  style={{ marginLeft: 6 }}
                  onClick={() => nav.item(decisionId)}
                >
                  {decisionId}
                </button>
              ))}
              <div className="report-rating-reason">{expected.reason}</div>
            </div>
            <FeedbackButtons caseId={caseId} item={`expected:${expected.id}`} />
          </div>
        );
      })}

      <div className="markdown-body">
        <h4 className="report-group-title">Requirements</h4>
        {parsed.requirements.length === 0 && <div className="report-note">No requirements.</div>}
        {parsed.requirements.map((item) => (
          <div key={`${item.id}-${item.line}`} id={`report-item-${item.id}`} className="report-doc-item">
            <span className="simple-id-chip">{item.id}</span>{" "}
            <ReactMarkdown components={components}>{item.text || "*(empty)*"}</ReactMarkdown>
            <RatingLine rating={requirementRatings.get(item.id)} caseId={caseId} item={`requirement:${item.id}`} />
          </div>
        ))}

        <h4 className="report-group-title">Assumptions</h4>
        {parsed.assumptions.length === 0 && <div className="report-note">No assumptions.</div>}
        {parsed.assumptions.map((item) => (
          <div key={`${item.id}-${item.line}`} id={`report-item-${item.id}`} className="report-doc-item">
            <span className="simple-id-chip simple-id-chip-assumption">{item.id}</span>{" "}
            <ReactMarkdown components={components}>{item.text || "*(empty)*"}</ReactMarkdown>
          </div>
        ))}

        <h4 className="report-group-title">Decisions</h4>
        {parsed.decisions.length === 0 && <div className="report-note">No decisions.</div>}
        {parsed.decisions.map((item) => (
          <div key={`${item.id}-${item.line}`} id={`report-item-${item.id}`} className="report-doc-item">
            <span className="simple-id-chip simple-id-chip-decision">{item.id}</span>{" "}
            <ReactMarkdown components={components}>{item.text || "*(empty)*"}</ReactMarkdown>
            <RatingLine rating={decisionRatings.get(item.id)} caseId={caseId} item={`decision:${item.id}`} />
            <div className="simple-sketch" id={`report-sketch-${item.id}`}>
              {hasSketch(item) && !item.sketch?.parseError ? (
                <MermaidBlock chart={item.sketchCode ?? ""} />
              ) : (
                <div className="simple-sketch-empty">{item.sketch?.parseError ?? "No sketch."}</div>
              )}
              <RatingLine rating={sketchRatings.get(item.id)} caseId={caseId} item={`sketch:${item.id}`} />
            </div>
          </div>
        ))}

        <h4 className="report-group-title">Final diagram</h4>
        {parsed.final.nodes.length === 0 || parsed.final.parseError ? (
          <div className="report-note">{parsed.final.parseError ?? "No final diagram."}</div>
        ) : (
          <div className="simple-final-diagram">
            <BadgedDiagram
              code={snapshot.finalCode}
              nodeDecisions={parsed.nodeDecisions}
              unjustifiedNodes={result.links.unjustified}
              onBadgeClick={nav.item}
            />
          </div>
        )}
        {finalNodes.length > 0 && (
          <div className="simple-legend" style={{ marginTop: 8 }}>
            {finalNodes.map((node) => (
              <div key={node.id} id={`report-node-${node.id}`} className="simple-legend-row report-doc-item">
                <code>{node.id}</code>
                <span className="simple-legend-label">{node.label}</span>
                {(parsed.nodeDecisions[node.id] ?? []).length === 0 ? (
                  <span className="simple-legend-none">no decision explains this box</span>
                ) : (
                  parsed.nodeDecisions[node.id].map((decisionId) => (
                    <button
                      key={decisionId}
                      type="button"
                      className="simple-legend-badge"
                      onClick={() => nav.item(decisionId)}
                    >
                      {decisionId}
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
