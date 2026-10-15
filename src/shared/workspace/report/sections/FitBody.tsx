import { Typography } from "@mui/material";
import type { CaseDefinition } from "../../../../cases";
import type { FitResult } from "../../../../assessment/fit";
import type { AssessmentResult, SessionMode } from "../../../../assessment/types";
import { FeedbackButtons } from "../FeedbackButtons";
import { MethodPill } from "../MethodPill";

const FIT_ICON: Record<FitResult["verdict"], string> = { handled: "✓", partly: "⚠", not_handled: "✗", uncertain: "?" };
const FIT_LABEL: Record<FitResult["verdict"], string> = { handled: "Handled", partly: "Partly handled", not_handled: "Not handled", uncertain: "Uncertain" };

/** Fit: one card per scenario — what the design picks for it, and whether that covers it. */
export function FitBody({
  result,
  caseDefinition,
  mode,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  mode: SessionMode;
}) {
  if (result.fit.scenarios.length === 0) return <Typography variant="body2">This case has no scenarios.</Typography>;
  return (
    <>
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
    </>
  );
}
