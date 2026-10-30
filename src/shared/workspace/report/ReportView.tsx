import { useMemo } from "react";
import { Button, Typography } from "@mui/material";
import type { CaseDefinition } from "../../../cases";
import { computeElicitation } from "../../../assessment/elicitation";
import { orderedTraces } from "../../../assessment/reportModel";
import type { AssessmentResult, SessionMode } from "../../../assessment/types";
import type { TimelineEntry } from "../../lib/types";
import { buildReferences, ReferenceContext } from "../panels/references";
import type { CitationHandlers } from "../panels/citationLinks";
import { BoxRef, CellEmpty, ChatRef, CheckRow, ItemRef, LayerCell, LayerCols, ReportLayer, ReportSection, Stat } from "./ReportLayer";
import { RationaleWeb, TraceabilityWeb } from "./DesignWebs";
import { FeedbackButtons } from "./FeedbackButtons";
import { LayerCollapseContext, useReportCollapse } from "./reportTypes";
import type { ReportSnapshot } from "./reportTypes";
import { BanoPanel } from "./sections/BanoPanel";
import { ElicitationMetrics, QuestioningTurns, RequirementsFoundAndMissed } from "./sections/ElicitationBody";
import { IsoCritiqueBody } from "./sections/IsoCritiqueBody";
import { JudgedItemsList } from "./sections/JudgedItemsList";
import { KeepBody } from "./sections/KeepBody";
import { TraceLinksList } from "./sections/TraceLinksList";
import "./report.css";

type Props = {
  result: AssessmentResult;
  snapshot: ReportSnapshot;
  caseDefinition: CaseDefinition;
  mode: SessionMode;
  admin?: boolean;
  timeline: TimelineEntry[];
  citation: CitationHandlers;
  template: string;
  timeOnTaskMs?: number;
  diagramPrompts?: number;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
};

const DIMENSIONS = [
  { key: "decision", label: "Decision link" },
  { key: "diagram", label: "Diagram linkage" },
  { key: "justification", label: "Design justification" },
] as const;

const verdictState = (verdict: string) => (verdict === "sound" ? "pass" : verdict === "unsound" ? "fail" : "na");

/**
 * The review of one submission: five sections, each a band of its own that folds away, with every
 * reference to the chat, an item or a diagram box drawn as the chip the design document uses.
 */
export function ReportView({ result, snapshot, caseDefinition, mode, citation, headerExtra, onClose }: Props) {
  const collapse = useReportCollapse();
  const references = useMemo(() => buildReferences(snapshot.parsed, snapshot.messages), [snapshot]);

  const elicitation = result.process.elicitation ?? computeElicitation(caseDefinition, snapshot.messages, []);
  const hidden = caseDefinition.facts.filter((fact) => fact.disclosure !== "given");
  const elicited = new Set(elicitation.elicitedIds);
  const traces = orderedTraces(result, mode);
  const carried = traces.filter((trace) => trace.state === "carried_through").length;
  const adequacy = new Map(result.scenarioAdequacy?.map((item) => [item.scenarioId, item]) ?? []);
  const fit = new Map(result.fit.scenarios.map((item) => [item.scenarioId, item]));
  const critique = result.isoCritique ?? [];
  const judgedCritique = critique.filter((item) => item.verdict !== "not_addressed");
  const handled = (result.scenarioAdequacy ?? result.fit.scenarios).filter(
    (item) => ("outcome" in item ? item.outcome : item.verdict) === "handled",
  ).length;
  const { gate } = result;
  const gateIssues =
    gate.failedReplies.length + gate.clientFailed.length + gate.leaks.length + gate.phantoms.length + gate.inventedSpecifics.length;

  const factLabel = (factId: string) => caseDefinition.facts.find((fact) => fact.id === factId)?.label ?? factId;
  const itemIds = new Set(
    [...snapshot.parsed.requirements, ...snapshot.parsed.decisions].map((item) => item.id),
  );
  /** An R#, A# or D# id opens the item; anything else is a box in the final diagram. */
  const renderRef = (id: string) =>
    itemIds.has(id) ? (
      <ItemRef key={id} id={id} onClick={citation.onItem} />
    ) : (
      <BoxRef key={id} node={id} onClick={() => citation.onNode?.(id)} />
    );
  const refList = (ids: string[]) => (ids.length ? <span className="report-box-refs">{ids.map(renderRef)}</span> : <>none</>);

  return (
    <ReferenceContext.Provider value={references}>
      <LayerCollapseContext.Provider value={collapse}>
        <div className="report-view">
          <header className="report-header">
            <div>
              <Typography variant="h6">Review of your design</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(result.reviewedAt).toLocaleString()} · {result.model || "code only"}
              </Typography>
            </div>
            <div className="report-header-actions">
              {headerExtra}
              {onClose && (
                <Button size="small" variant="outlined" onClick={onClose}>
                  Back to my work
                </Button>
              )}
            </div>
          </header>

          <div className="report-layers">
            <ReportLayer
              layerId="chatbot"
              title="1. AI Client Chatbot"
              question="Did the simulated client behave correctly, and was this a session worth scoring?"
              summary={gate.sessionComplete ? "Session complete" : "Session incomplete"}
            >
              <ReportSection
                sectionId="chatbot-client"
                title="Client behaviour"
                question="Diagnostics for the simulated client and the session, not for your work. A client failure stays in the IRE denominator."
              >
                <div className="report-mini-stats">
                  <Stat value={String(gate.failedReplies.length)} label="failed replies" />
                  <Stat value={String(gate.clientFailed.length)} label="client failures" />
                  <Stat value={String(gate.leaks.length)} label="leaks" />
                  <Stat value={String(gate.phantoms.length)} label="phantoms" />
                  <Stat value={String(gate.inventedSpecifics.length)} label="invented details" />
                </div>
                <LayerCols>
                  <LayerCell
                    title="Client failure"
                    subtitle="You asked about these, but the client never gave them. They stay in the denominator, not counted as missed."
                    method="ai_verified_quote"
                  >
                    {gate.clientFailed.length === 0 && <CellEmpty>None: every requirement you asked about came up.</CellEmpty>}
                    {gate.clientFailed.map((item) => (
                      <div key={item.factId} className="report-row">
                        <div className="report-row-main">
                          <span className="report-row-title">{factLabel(item.factId)}</span>
                          <div className="report-quote">
                            You asked: “{item.quote}” <ChatRef index={item.messageIndex} quote={item.quote} onChat={citation.onChat} />
                          </div>
                        </div>
                        <FeedbackButtons caseId={caseDefinition.id} item={`clientFailed:${item.factId}`} />
                      </div>
                    ))}
                  </LayerCell>

                  <LayerCell
                    title="Invented details"
                    subtitle="Things the client said that match no requirement in the case. The answer key may be incomplete for this session."
                    method="code"
                  >
                    {gate.inventedSpecifics.length === 0 && <CellEmpty>None: the client stayed within the case.</CellEmpty>}
                    {gate.inventedSpecifics.map((item, index) => (
                      <div key={`${item.messageIndex}:${index}`} className="report-row">
                        <div className="report-row-main report-quote">
                          “{item.text}” <ChatRef index={item.messageIndex} quote={item.text} onChat={citation.onChat} />
                        </div>
                        <FeedbackButtons caseId={caseDefinition.id} item={`invented:${item.messageIndex}:${index}`} />
                      </div>
                    ))}
                  </LayerCell>

                  <LayerCell title="Session completed" subtitle="Timeouts, crashes and mislabelled replies make the rest harder to read." method="code">
                    <CheckRow
                      label={
                        gate.sessionComplete
                          ? "Every client reply arrived"
                          : `${gate.failedReplies.length} client ${gate.failedReplies.length === 1 ? "reply" : "replies"} failed`
                      }
                      state={gate.sessionComplete ? "pass" : "fail"}
                    />
                    {gate.failedReplies.map((index) => (
                      <div key={index} className="report-row">
                        <div className="report-row-main report-quote">
                          Failed reply <ChatRef index={index} onChat={citation.onChat} />
                        </div>
                      </div>
                    ))}
                    <CheckRow
                      label={`Leaks: ${gate.leaks.length}; phantoms: ${gate.phantoms.length}`}
                      state={gate.leaks.length + gate.phantoms.length ? "fail" : "pass"}
                      detail={
                        [...gate.leaks, ...gate.phantoms].length > 0 && (
                          <>
                            {[...gate.leaks, ...gate.phantoms].map((item, index) => (
                              <span key={`${item.factId}-${index}`}>
                                {factLabel(item.factId)} <ChatRef index={item.messageIndex} onChat={citation.onChat} />{" "}
                              </span>
                            ))}
                          </>
                        )
                      }
                    />
                    {gateIssues === 0 && <CellEmpty>No chatbot or session issue found.</CellEmpty>}
                  </LayerCell>
                </LayerCols>
              </ReportSection>
            </ReportLayer>

            <ReportLayer
              layerId="elicitation"
              title="2. Requirement Elicitation"
              question="Which of the requirements the client was holding did you get out of them, and how did you ask?"
              summary={`${elicitation.elicitedIds.length}/${hidden.length} hidden requirements elicited`}
            >
              <ReportSection
                sectionId="elicitation-metrics"
                title="The measures"
                question="Coverage (IRE), how often a kind of question worked (ESR), and how early the key questions came (TKQR)."
                method="code"
              >
                <ElicitationMetrics elicitation={elicitation} />
              </ReportSection>

              <ReportSection
                sectionId="elicitation-requirements"
                title="Requirements found and missed"
                question="Each hidden requirement, and what your interview did about it."
              >
                <RequirementsFoundAndMissed
                  result={result}
                  caseDefinition={caseDefinition}
                  mode={mode}
                  elicited={elicited}
                  onChat={citation.onChat}
                />
              </ReportSection>

              <ReportSection
                sectionId="elicitation-turns"
                title="Questioning turns"
                question="Every turn you took, how it was classified, and what the client gave up after it."
                method="ai_judgment"
              >
                <QuestioningTurns elicitation={elicitation} onChat={citation.onChat} />
              </ReportSection>

              <ReportSection
                sectionId="elicitation-bano"
                title="How you interviewed"
                question="Interviewing mistakes from a published checklist. Teaching feedback only: nothing here is scored."
                method="ai_judgment"
              >
                {result.process.bano ? (
                  <BanoPanel report={result.process.bano} caseId={caseDefinition.id} mode={mode} showNumbers={false} onChat={citation.onChat} />
                ) : (
                  <CheckRow state="na" label="The interview-mistake check did not run for this review." />
                )}
              </ReportSection>
            </ReportLayer>

            <ReportLayer
              layerId="design-doc"
              title="3. Design Document"
              question="Is every piece there and linked up, and does the reasoning behind each one make sense?"
              summary={`${carried}/${traces.length} found requirements carried through`}
            >
              <ReportSection
                sectionId="design-traceability"
                title="Traceability"
                question="Is every piece there, and does every link between them exist, forward and backward?"
                method="code"
              >
                <div className="report-web">
                  <h4 className="report-web-title">Flow of references</h4>
                  <div className="report-cell-subtitle">
                    Every source, requirement, decision, design (each decision&rsquo;s sketch) and component, joined by the
                    references between them.
                  </div>
                  <TraceabilityWeb doc={snapshot.parsed} result={result} citation={citation} />
                </div>
                <ReportSection
                  sectionId="design-traceability-links"
                  title="Links"
                  question="Only what is missing is listed: a link lost along the way, or a piece with no origin."
                  method="code"
                >
                  <TraceLinksList result={result} caseDefinition={caseDefinition} doc={snapshot.parsed} citation={citation} />
                </ReportSection>
                <ReportSection
                  sectionId="design-traceability-facts"
                  title="Requirements carried through"
                  question="Each requirement the client gave you, followed from the chat to the final diagram, with the break marked."
                  method="code"
                >
                  <KeepBody result={result} caseDefinition={caseDefinition} doc={snapshot.parsed} traces={traces} onItem={citation.onItem} />
                </ReportSection>
              </ReportSection>

              <ReportSection
                sectionId="design-rationale"
                title="Rationale"
                question="Does it make sense? Each requirement, decision and sketch is judged on its own, and each link against what it cites."
                method="ai_verified_quote"
              >
                <div className="report-web">
                  <h4 className="report-web-title">Soundness of references</h4>
                  <div className="report-cell-subtitle">
                    Each item is coloured by the judgment of it on its own; each link by the judgment of that link. Hover
                    either to read the reason.
                  </div>
                  <RationaleWeb doc={snapshot.parsed} result={result} citation={citation} />
                </div>
                <JudgedItemsList result={result} caseDefinition={caseDefinition} doc={snapshot.parsed} citation={citation} />
              </ReportSection>
            </ReportLayer>

            <ReportLayer
              layerId="scenarios"
              title="4. Scenario Adequacy"
              question="Does the design handle the situations this client will face?"
              summary={`${handled}/${result.fit.scenarios.length} scenarios handled`}
            >
              {caseDefinition.scenarios.length === 0 && <CellEmpty>This case has no scenarios.</CellEmpty>}
              {caseDefinition.scenarios.map((scenario) => {
                const answer = fit.get(scenario.id);
                const review = adequacy.get(scenario.id);
                const outcome = review?.outcome ?? answer?.verdict ?? "uncertain";
                return (
                  <ReportSection
                    key={scenario.id}
                    sectionId={`scenario-${scenario.id}`}
                    title={`${scenario.given} / ${scenario.when}`}
                    method="ai_verified_quote"
                    summary={<span className={`report-rating report-rating-${outcome}`}>{outcome.replace(/_/g, " ")}</span>}
                  >
                    <LayerCols columns={2}>
                      <LayerCell title="The situation" subtitle="What the client will face, and the path you picked for it.">
                        <div className="report-row">
                          <div className="report-row-main">
                            <div className="report-row-detail">
                              <strong>Given</strong> {scenario.given}
                            </div>
                            <div className="report-row-detail">
                              <strong>When</strong> {scenario.when}
                            </div>
                            <div className="report-row-detail">
                              <strong>Then</strong> {scenario.then}
                            </div>
                          </div>
                        </div>
                        <div className="report-row">
                          <div className="report-row-main">
                            <span className="report-row-title">Your path</span>
                            <div className="report-row-detail">Decisions: {refList(answer?.pickedDecisionIds ?? [])}</div>
                            <div className="report-row-detail">Components: {refList(answer?.pickedNodeIds ?? [])}</div>
                            {answer?.oneLiner && <div className="report-quote">“{answer.oneLiner}”</div>}
                          </div>
                          <FeedbackButtons caseId={caseDefinition.id} item={`scenario:${scenario.id}`} />
                        </div>
                        {answer?.codeFlags.map((flag) => (
                          <div key={flag} className="report-note report-note-warn">
                            {flag}
                          </div>
                        ))}
                        {mode === "practice" && (
                          <div className="report-note">
                            <strong>A good answer:</strong> {scenario.goodAnswerNotes}
                          </div>
                        )}
                      </LayerCell>

                      <LayerCell title="How well it holds up" subtitle="The picked decision, its place in the diagram, and your explanation.">
                        {DIMENSIONS.map(({ key, label }) => {
                          const verdict = review?.[key] ?? "uncertain";
                          return (
                            <CheckRow
                              key={key}
                              state={verdictState(verdict)}
                              label={
                                <>
                                  <span className={`report-rating report-rating-${verdict}`}>{verdict}</span>
                                  {label}
                                </>
                              }
                              detail={<span className="report-rating-reason">{review?.reasons[key] ?? "Not checked in this review."}</span>}
                            />
                          );
                        })}
                      </LayerCell>
                    </LayerCols>
                  </ReportSection>
                );
              })}
            </ReportLayer>

            <ReportLayer
              layerId="overall"
              title="5. Overall design · ISO/IEC 25010"
              question="Does the design hold up against the product quality characteristics of ISO/IEC 25010:2023?"
              summary={
                judgedCritique.length
                  ? `${judgedCritique.length}/${critique.length} characteristics addressed`
                  : "No ISO 25010 critique available"
              }
            >
              <IsoCritiqueBody critique={critique} caseId={caseDefinition.id} renderRef={renderRef} />
            </ReportLayer>
          </div>
        </div>
      </LayerCollapseContext.Provider>
    </ReferenceContext.Provider>
  );
}
