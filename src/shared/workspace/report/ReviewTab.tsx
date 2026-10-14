import { useState } from "react";
import { Button, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import type { CaseDefinition } from "../../../cases";
import type { FitResult } from "../../../assessment/fit";
import type { JustifyItem } from "../../../assessment/justify";
import { sketchItemId } from "../../../assessment/justify";
import type { AssessmentResult, SessionMode } from "../../../assessment/types";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import { MermaidBlock } from "../../components/MermaidBlock";
import { citationComponents } from "../panels/citationLinks";
import type { CitationHandlers } from "../panels/citationLinks";
import { FeedbackButtons } from "./FeedbackButtons";
import { MethodPill } from "./MethodPill";

type ReviewTabProps = {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  doc: ParsedDesignDoc;
  mode: SessionMode;
  /** Research admin: show each judge run's verdict. */
  showRuns: boolean;
  citation: CitationHandlers;
};

/** How each verdict reads, like a GitHub review: no comment, Comment, Request changes, Uncertain. */
const COMMENT: Record<JustifyItem["verdict"], { icon: string; title: string } | null> = {
  sound: null,
  weak: { icon: "💬", title: "Comment" },
  unsound: { icon: "✗", title: "Request changes" },
  uncertain: { icon: "?", title: "Uncertain" },
  skipped_lint: { icon: "⊘", title: "Not judged" },
};

function MarginComment({ item, caseId, mode, showRuns }: { item: JustifyItem | undefined; caseId: string; mode: SessionMode; showRuns: boolean }) {
  const [resolved, setResolved] = useState(false);
  if (!item) return <div className="review-margin" />;
  const comment = COMMENT[item.verdict];
  if (!comment) {
    return (
      <div className="review-margin">
        <span className="review-sound" aria-label="sound">
          ✓
        </span>
      </div>
    );
  }
  if (resolved) {
    return (
      <div className="review-margin">
        <button type="button" className="link-button" onClick={() => setResolved(false)}>
          Resolved: show comment
        </button>
      </div>
    );
  }
  return (
    <div className="review-margin">
      <div className={`review-comment ${item.verdict}`}>
        <div className="review-comment-head">
          <span aria-hidden="true">{comment.icon}</span> <strong>{comment.title}</strong> <MethodPill method={item.method} />
          <FeedbackButtons caseId={caseId} item={`justify:${item.itemId}`} />
        </div>
        {item.reason && <p>{item.reason}</p>}
        {item.quotes.map((quote) => (
          <blockquote key={quote}>“{quote}”</blockquote>
        ))}
        {showRuns && item.runs.length > 0 && <div className="review-runs">Runs: {item.runs.join(", ")}</div>}
        {mode === "practice" && (
          <Button size="small" onClick={() => setResolved(true)}>
            Resolve conversation
          </Button>
        )}
      </div>
    </div>
  );
}

const FIT_ICON: Record<FitResult["verdict"], string> = { handled: "✓", partly: "⚠", not_handled: "✗", uncertain: "?" };
const FIT_LABEL: Record<FitResult["verdict"], string> = { handled: "Handled", partly: "Partly handled", not_handled: "Not handled", uncertain: "Uncertain" };

/** The AI review, like GitHub's "Files changed": the submitted doc with comments in the margin, then Fit. */
export function ReviewTab({ result, caseDefinition, doc, mode, showRuns, citation }: ReviewTabProps) {
  const items = new Map(result.justify.items.map((item) => [item.itemId, item]));
  const components = citationComponents(citation);
  const row = (id: string, label: string, body: React.ReactNode, itemId = id) => (
    <div key={itemId} className="review-row">
      <div className="review-line">
        <span className="simple-id-chip">{label}</span> {body}
      </div>
      <MarginComment item={items.get(itemId)} caseId={caseDefinition.id} mode={mode} showRuns={showRuns} />
    </div>
  );

  return (
    <div className="review-tab">
      <h3>Requirements</h3>
      {doc.requirements.map((item) => row(item.id, item.id, <ReactMarkdown components={components}>{item.text}</ReactMarkdown>))}
      <h3>Assumptions</h3>
      {doc.assumptions.map((item) => (
        <div key={item.id} className="review-row">
          <div className="review-line">
            <span className="simple-id-chip simple-id-chip-assumption">{item.id}</span> <ReactMarkdown components={components}>{item.text}</ReactMarkdown>
          </div>
          <div className="review-margin" />
        </div>
      ))}
      <h3>Decisions</h3>
      {doc.decisions.map((decision) => (
        <div key={decision.id}>
          {row(
            decision.id,
            decision.id,
            <span>
              <strong>{decision.title}</strong>
              <span className="review-fields">
                {decision.because.length > 0 && <span>Because: {decision.because.join(", ")}</span>}
                {decision.insteadOf && <span>Instead of: {decision.insteadOf}</span>}
                {decision.tradeOff !== null && <span>Trade-off: {decision.tradeOff || "—"}</span>}
                {decision.qualityText && <span>Quality: {decision.qualityText}</span>}
              </span>
            </span>,
          )}
          {decision.sketchCode &&
            row(
              decision.id,
              `${decision.id} sketch`,
              <div className="review-sketch">
                <MermaidBlock chart={decision.sketchCode} />
              </div>,
              sketchItemId(decision.id),
            )}
        </div>
      ))}

      <h3>Fit: scenarios</h3>
      {result.fit.scenarios.length === 0 && <Typography variant="body2">This case has no scenarios.</Typography>}
      {result.fit.scenarios.map((scenario) => {
        const definition = caseDefinition.scenarios.find((item) => item.id === scenario.scenarioId);
        return (
          <article key={scenario.scenarioId} className={`fit-card ${scenario.verdict}`}>
            <header>
              <span className={`fit-chip ${scenario.verdict}`}>
                {FIT_ICON[scenario.verdict]} {FIT_LABEL[scenario.verdict]}
              </span>
              <MethodPill method={scenario.method} />
              <FeedbackButtons caseId={caseDefinition.id} item={`fit:${scenario.scenarioId}`} />
            </header>
            {definition && (
              <p className="gherkin">
                <b>Given</b> {definition.given}, <b>When</b> {definition.when}, <b>Then</b> {definition.then}
              </p>
            )}
            <p>
              Picked: {scenario.pickedDecisionIds.join(", ") || "no decisions"}; boxes: {scenario.pickedNodeIds.join(", ") || "none"}
            </p>
            {scenario.oneLiner && <blockquote>“{scenario.oneLiner}”</blockquote>}
            {scenario.reason && <p>{scenario.reason}</p>}
            {scenario.codeFlags.length > 0 && (
              <ul className="fit-flags">
                {scenario.codeFlags.map((flag) => (
                  <li key={flag}>⚠ {flag}</li>
                ))}
              </ul>
            )}
            {mode === "practice" && definition && (
              <p className="good-answer">
                <strong>A good answer:</strong> {definition.goodAnswerNotes}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
