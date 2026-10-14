import { useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";
import type { CaseDefinition } from "../../../cases";
import type { ScenarioAnswer } from "../../../assessment/fit";
import type { SessionMode } from "../../../assessment/types";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import { plainNodeLabel } from "../../../designDoc/parse";
import { MermaidBlock } from "../../components/MermaidBlock";
import { nodeIdAt } from "../panels/highlight";
import "./walkthrough.css";

type ScenarioWalkthroughProps = {
  caseDefinition: CaseDefinition;
  doc: ParsedDesignDoc;
  finalCode: string;
  mode: SessionMode;
  initialAnswers?: ScenarioAnswer[];
  /** All scenarios answered: run the checks. */
  onFinish: (answers: ScenarioAnswer[]) => void;
  /** Back to the (unlocked) work, practice mode only. */
  onCancel?: () => void;
};

const blank = (scenarioId: string): ScenarioAnswer => ({ scenarioId, pickedDecisionIds: [], pickedNodeIds: [], oneLiner: "", notHandled: false });

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

/**
 * After Submit, the doc and diagram are locked and each scenario comes up in turn, like a PR checklist
 * with Cucumber's Given / When / Then: tick the decisions that handle it, click the boxes involved, and
 * write one line on how — or tick "Not handled".
 */
export function ScenarioWalkthrough({ caseDefinition, doc, finalCode, mode, initialAnswers = [], onFinish, onCancel }: ScenarioWalkthroughProps) {
  const scenarios = caseDefinition.scenarios;
  const [answers, setAnswers] = useState<ScenarioAnswer[]>(() =>
    scenarios.map((scenario) => initialAnswers.find((answer) => answer.scenarioId === scenario.id) ?? blank(scenario.id)),
  );
  const [step, setStep] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const scenario = scenarios[step];
  const answer = answers[step];
  const nodes = doc.final.nodes;

  const update = (change: Partial<ScenarioAnswer>) =>
    setAnswers((previous) => previous.map((item, index) => (index === step ? { ...item, ...change } : item)));
  const answered = answer.notHandled || (answer.pickedDecisionIds.length > 0 && answer.oneLiner.trim().length > 0);
  const last = step === scenarios.length - 1;

  const next = () => {
    if (mode === "practice" && !showNotes) {
      setShowNotes(true);
      return;
    }
    setShowNotes(false);
    if (last) onFinish(answers);
    else setStep(step + 1);
  };

  if (!scenario) {
    return (
      <div className="walkthrough">
        <Typography>This case has no scenarios.</Typography>
        <Button variant="contained" onClick={() => onFinish([])}>
          Run the checks
        </Button>
      </div>
    );
  }

  return (
    <div className="walkthrough">
      <header className="walkthrough-header">
        <div>
          <Typography variant="h6">Walk through your design</Typography>
          <Typography variant="body2" color="text.secondary">
            Your doc and diagram are locked. For each situation, show how your design handles it. About 5–8 minutes; it doesn't count
            against the interview time.
          </Typography>
        </div>
        <span className="walkthrough-step" aria-live="polite">
          Scenario {step + 1} of {scenarios.length}
        </span>
      </header>

      <ul className="walkthrough-progress" aria-hidden="true">
        {scenarios.map((item, index) => (
          <li key={item.id} className={index < step ? "done" : index === step ? "current" : ""}>
            {index < step ? "✓" : index + 1}
          </li>
        ))}
      </ul>

      <section className="gherkin-card" aria-label="Scenario">
        <p>
          <span className="gherkin-key">Given</span> {scenario.given}
        </p>
        <p>
          <span className="gherkin-key">When</span> {scenario.when}
        </p>
        <p>
          <span className="gherkin-key">Then</span> {scenario.then}
        </p>
      </section>

      <fieldset className="walkthrough-field" disabled={answer.notHandled}>
        <legend>Which decisions handle it?</legend>
        <div className="chip-row">
          {doc.decisions.map((decision) => {
            const on = answer.pickedDecisionIds.includes(decision.id);
            return (
              <button
                key={decision.id}
                type="button"
                className={`label-pill ${on ? "on" : ""}`}
                aria-pressed={on}
                title={decision.title}
                onClick={() => update({ pickedDecisionIds: toggle(answer.pickedDecisionIds, decision.id) })}
              >
                {on ? "☑" : "☐"} {decision.id}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="walkthrough-field" disabled={answer.notHandled}>
        <legend>Which boxes are involved? Click them in the diagram or below.</legend>
        {finalCode && (
          <div
            className="walkthrough-diagram"
            onClick={(event) => {
              if (answer.notHandled) return;
              const id = nodeIdAt(event.target);
              if (id && nodes.some((node) => node.id === id)) update({ pickedNodeIds: toggle(answer.pickedNodeIds, id) });
            }}
          >
            <MermaidBlock chart={finalCode} />
          </div>
        )}
        <div className="chip-row">
          {nodes.map((node) => {
            const on = answer.pickedNodeIds.includes(node.id);
            return (
              <button
                key={node.id}
                type="button"
                className={`label-pill ${on ? "on" : ""}`}
                aria-pressed={on}
                onClick={() => update({ pickedNodeIds: toggle(answer.pickedNodeIds, node.id) })}
              >
                {on ? "☑" : "☐"} {plainNodeLabel(node.label)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <TextField
        label="In one line, how does your design handle it?"
        value={answer.oneLiner}
        onChange={(event) => update({ oneLiner: event.target.value })}
        disabled={answer.notHandled}
        fullWidth
        slotProps={{ htmlInput: { maxLength: 300 } }}
      />
      <FormControlLabel
        control={<Checkbox checked={answer.notHandled} onChange={(event) => update({ notHandled: event.target.checked })} />}
        label="Not handled: my design doesn't cover this"
      />

      {showNotes && (
        <Alert severity="info" icon={<span aria-hidden="true">💡</span>}>
          <strong>A good answer:</strong> {scenario.goodAnswerNotes}
        </Alert>
      )}

      <div className="walkthrough-actions">
        {onCancel && step === 0 && !showNotes && (
          <Button onClick={onCancel}>Back to my work</Button>
        )}
        {step > 0 && !showNotes && <Button onClick={() => setStep(step - 1)}>Back</Button>}
        <Button variant="contained" onClick={next} disabled={!answered}>
          {mode === "practice" && !showNotes ? "Save answer" : last ? "Finish and run the checks" : "Next scenario"}
        </Button>
      </div>
    </div>
  );
}
