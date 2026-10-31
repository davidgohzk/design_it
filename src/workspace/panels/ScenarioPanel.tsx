import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";
import type { CaseDefinition } from "@/cases";
import { upsertScenarioAnswer } from "@/review/levels/fit";
import type { ScenarioAnswer } from "@/review/levels/fit";
import type { ParsedDesignDoc } from "@/designDoc/parse";
import { plainNodeLabel } from "@/designDoc/parse";
import { MermaidBlock } from "@/ui/MermaidBlock";
import { nodeIdAt, paintDiagram } from "./highlight";
import { scenarioDiagramCode } from "./scenarioDiagram";
import "./scenarioPanel.css";

type Props = {
  caseDefinition: CaseDefinition;
  doc: ParsedDesignDoc;
  finalCode: string;
  answers: ScenarioAnswer[];
  onChange: (answers: ScenarioAnswer[]) => void;
};

const blank = (scenarioId: string): ScenarioAnswer => ({
  scenarioId,
  pickedDecisionIds: [],
  pickedNodeIds: [],
  oneLiner: "",
  notHandled: false,
});

const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
const complete = (answer?: ScenarioAnswer) => Boolean(answer && (answer.notHandled || (answer.pickedDecisionIds.length > 0 && answer.oneLiner.trim())));

/** Scenario answers stay beside the interview and design doc throughout the work stage. */
export function ScenarioPanel({ caseDefinition, doc, finalCode, answers, onChange }: Props) {
  const [selected, setSelected] = useState(0);
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const scenarios = caseDefinition.scenarios;
  const scenario = scenarios[selected];
  const answer = scenario ? answers.find((item) => item.scenarioId === scenario.id) ?? blank(scenario.id) : null;
  const selectedNodes = useMemo(() => answer?.pickedNodeIds ?? [], [answer?.pickedNodeIds]);
  useEffect(() => {
    paintDiagram(diagramRef.current, Object.fromEntries(selectedNodes.map((id) => [id, { color: "#0969da" }])));
  }, [selectedNodes]);
  const update = (change: Partial<ScenarioAnswer>) => {
    if (!answer) return;
    const next = { ...answer, ...change };
    onChange(upsertScenarioAnswer(answers, next));
  };

  return <div className="scenario-panel">
    <header className="panel-header">
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Scenarios</Typography>
      <span className="scenario-panel-count">{scenarios.filter((item) => complete(answers.find((answer) => answer.scenarioId === item.id))).length}/{scenarios.length} answered</span>
    </header>
    <div className="scenario-panel-body scrollable">
      {scenarios.length === 0 ? <p>This case has no scenarios. Review can run without scenario answers.</p> : <>
        <nav className="scenario-tabs" aria-label="Scenarios">
          {scenarios.map((item, index) => {
            const saved = answers.find((entry) => entry.scenarioId === item.id);
            return <button key={item.id} type="button" className={index === selected ? "selected" : ""} aria-current={index === selected ? "step" : undefined} title={`${item.given}; ${item.when}`} onClick={() => setSelected(index)}>
              Scenario {index + 1}<span>{saved?.notHandled ? "Not handled" : complete(saved) ? "Answered" : "Unanswered"}</span>
            </button>;
          })}
        </nav>
        <section className="scenario-prompt" aria-label={`Scenario ${selected + 1}`}>
          <p><strong>Given</strong> {scenario.given}</p>
          <p><strong>When</strong> {scenario.when}</p>
          <p><strong>Then</strong> {scenario.then}</p>
        </section>
        <p className="scenario-panel-hint">Show how your design handles this situation. Unanswered scenarios will be marked Not handled when you review.</p>
        <fieldset className="scenario-field" disabled={answer!.notHandled}>
          <legend>Decisions that handle it</legend>
          <div className="scenario-choices">
            {doc.decisions.map((decision) => <button key={decision.id} type="button" className={`scenario-choice ${answer!.pickedDecisionIds.includes(decision.id) ? "selected" : ""}`} aria-pressed={answer!.pickedDecisionIds.includes(decision.id)} title={decision.title} onClick={() => update({ pickedDecisionIds: toggle(answer!.pickedDecisionIds, decision.id) })}>{decision.id} · {decision.title}</button>)}
            {answer!.pickedDecisionIds.filter((id) => !doc.decisions.some((item) => item.id === id)).map((id) => <button key={id} type="button" className="scenario-choice missing" onClick={() => update({ pickedDecisionIds: toggle(answer!.pickedDecisionIds, id) })}>{id} no longer exists · remove</button>)}
            {doc.decisions.length === 0 && <span className="scenario-empty">Write a decision in the design document first.</span>}
          </div>
        </fieldset>
        <fieldset className="scenario-field" disabled={answer!.notHandled}>
          <legend>Final-diagram components involved</legend>
          {doc.final.nodes.length > 0 && finalCode && <>
            <p className="scenario-diagram-hint">Click a component in the left-to-right diagram, or select its label below.</p>
            <div
              ref={diagramRef}
              className="scenario-diagram"
              aria-label="Final diagram for this scenario, laid out left to right"
              onClick={(event) => {
                if (answer!.notHandled) return;
                const id = nodeIdAt(event.target);
                if (id && doc.final.nodes.some((node) => node.id === id)) update({ pickedNodeIds: toggle(answer!.pickedNodeIds, id) });
              }}
            >
              <MermaidBlock chart={scenarioDiagramCode(finalCode)} onRender={() => {
                paintDiagram(diagramRef.current, Object.fromEntries(selectedNodes.map((id) => [id, { color: "#0969da" }])));
              }} />
            </div>
          </>}
          <div className="scenario-choices">
            {doc.final.nodes.map((node) => <button key={node.id} type="button" className={`scenario-choice ${answer!.pickedNodeIds.includes(node.id) ? "selected" : ""}`} aria-pressed={answer!.pickedNodeIds.includes(node.id)} onClick={() => update({ pickedNodeIds: toggle(answer!.pickedNodeIds, node.id) })}>{plainNodeLabel(node.label)}</button>)}
            {answer!.pickedNodeIds.filter((id) => !doc.final.nodes.some((node) => node.id === id)).map((id) => <button key={id} type="button" className="scenario-choice missing" onClick={() => update({ pickedNodeIds: toggle(answer!.pickedNodeIds, id) })}>{id} no longer exists · remove</button>)}
            {doc.final.nodes.length === 0 && <span className="scenario-empty">Add components to the final Mermaid block in the design document.</span>}
          </div>
        </fieldset>
        <TextField label="How does your design handle this scenario?" value={answer!.oneLiner} onChange={(event) => update({ oneLiner: event.target.value })} disabled={answer!.notHandled} fullWidth multiline minRows={2} slotProps={{ htmlInput: { maxLength: 300 } }} />
        <FormControlLabel control={<Checkbox checked={answer!.notHandled} onChange={(event) => update({ notHandled: event.target.checked })} />} label="Not handled: my design does not cover this" />
      </>}
    </div>
  </div>;
}
