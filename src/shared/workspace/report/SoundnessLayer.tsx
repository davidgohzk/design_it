import { useMemo } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { CaseDefinition } from "../../../cases";
import { SOUNDNESS_COLUMNS, soundnessGraph } from "../../../assessment/flow";
import type { SoundnessColumn, SoundnessEdge, SoundnessTone, WebEdge, WebNode } from "../../../assessment/flow";
import type { AssessmentResult, Rating, SimilarGroup, SimilarKind } from "../../../assessment/types";
import { usableSketches } from "../../../designDoc/consistency";
import { hasSketch } from "../../../designDoc/parse";
import type { ParsedDecision } from "../../../designDoc/parse";
import { linkBareItemIds } from "../../../designDoc/itemRefs";
import { MermaidBlock } from "../../components/MermaidBlock";
import { nodeIdAt } from "../panels/highlight";
import { citationComponents } from "../panels/citationLinks";
import { FeedbackButtons } from "./FeedbackButtons";
import { FlowWeb } from "./FlowWeb";
import { RATING_LABEL } from "./reportData";
import { BoxRef, ChatRef, ItemRef, ReportLayer, ReportSection } from "./ReportLayer";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

/** One AI judgment of an item: what was judged, the rating and why. */
type Check = {
  label: string;
  rating?: Rating;
  feedbackItem: string;
  /** Why there is no rating, when there can't be one. */
  notRated?: string;
};

/** One line of a row: a piece of the work, beside the AI's judgments of it. */
type Pair = { id: string; work: ReactNode; checks: Check[] };

type Alike = { group: SimilarGroup; others: string[] };

const GROUPS = {
  requirements: "level-2-requirements",
  decisions: "level-2-decisions",
  diagram: "level-2-diagram",
} as const;

/** Colours for the AI's verdicts, in the web. */
const TONE_COLORS: Record<SoundnessTone, string | undefined> = {
  sound: "#16a34a",
  weak: "#f59e0b",
  unsound: "#ef4444",
  unrated: "#94a3b8",
  neutral: undefined,
};
const COLUMN_LABELS: Record<SoundnessColumn, string> = {
  source: "Source",
  requirement: "Requirement",
  decision: "Decision",
  design: "Design",
  components: "Components",
};
const COLUMNS = SOUNDNESS_COLUMNS.map((id) => ({ id, label: COLUMN_LABELS[id] }));

/** A critique in a web tooltip: which judgment, the rating and why. */
function Critique({ label, rating }: { label: string; rating?: Rating }) {
  return (
    <div className="flow-tip-critique">
      <span className="flow-tip-label">{label}</span>{" "}
      {rating ? (
        <>
          <span className={`report-rating report-rating-${rating.rating}`}>{RATING_LABEL[rating.rating]}</span>
          {rating.reason}
        </>
      ) : (
        "not rated"
      )}
    </div>
  );
}

/** One AI judgment, under its label: the rating and why, or why there is none. */
function CheckCell({ check, caseId }: { check: Check; caseId: string }) {
  return (
    <div className="judged-check">
      <div className="judged-label">{check.label}</div>
      {check.rating ? (
        <div className="judged-line">
          <span className="judged-text">
            <span className={`report-rating report-rating-${check.rating.rating}`}>
              {RATING_LABEL[check.rating.rating]}
            </span>
            <span className="report-rating-reason">{check.rating.reason}</span>
          </span>
          <FeedbackButtons caseId={caseId} item={check.feedbackItem} />
        </div>
      ) : (
        <div className="judged-none">Not rated{check.notRated ? `: ${check.notRated}` : "."}</div>
      )}
    </div>
  );
}

/**
 * One row, as aligned pairs: each piece of the work beside the AI's judgments of it, then any items
 * the AI judged too alike to it. Each pair starts on the same line, however long either side runs.
 */
function JudgedRow({
  pairs,
  alike = [],
  caseId,
  onAlike,
}: {
  pairs: Pair[];
  alike?: Alike[];
  caseId: string;
  onAlike: (kind: SimilarKind, id: string) => void;
}) {
  return (
    <div className="judged-row">
      {pairs.map((pair, index) => {
        const next = index > 0 ? " is-next" : "";
        return (
          <div key={pair.id} className="judged-pair">
            <div className={`judged-work${next}`}>{pair.work}</div>
            <div className={`judged-ai${next}`}>
              {pair.checks.map((check) => (
                <CheckCell key={check.label} check={check} caseId={caseId} />
              ))}
            </div>
          </div>
        );
      })}
      {alike.length > 0 && (
        <div className="judged-pair">
          <div className="judged-work is-next" />
          <div className="judged-ai is-next">
            <div className="judged-label">Too alike</div>
            {alike.map(({ group, others }) => (
              <div key={`${group.kind}:${group.ids.join("+")}`} className="judged-line">
                <span className="judged-text">
                  <span className="report-rating report-rating-weak">too alike</span>
                  {group.kind === "sketches" && <span className="judged-kind">sketch of </span>}
                  {others.map((other) => (
                    <span key={other}>
                      <ItemRef id={other} onClick={(clicked) => onAlike(group.kind, clicked)} />{" "}
                    </span>
                  ))}
                  <span className="report-rating-reason">{group.reason}</span>
                </span>
                <FeedbackButtons caseId={caseId} item={`similar:${group.kind}:${group.ids.join("+")}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** What an item cites: its quote, its requirements, or its decision. */
const Cites = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="judged-cites">
    <div className="judged-label">{label}</div>
    {children}
  </div>
);

/**
 * Level 2: does it make sense? AI judgment throughout. A web opens the level: every source,
 * requirement, decision, design (each decision's sketch) and component, each coloured by the AI's
 * judgment of it on its own, every link by its judgment of that link. Clicking a node or a link jumps
 * to that judgment below, where each row shows the work on the left and the judgments on the right:
 * requirements against their quotes, decisions with their requirements and their sketch, and each
 * sketch placed into the final diagram.
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
  const { soundness } = result;
  const caseId = caseDefinition.id;
  const graph = useMemo(() => soundnessGraph(parsed, soundness), [parsed, soundness]);
  const byId = (ratings: Rating[]) => new Map(ratings.map((rating) => [rating.id, rating]));
  const components = useMemo(
    () => citationComponents({ onBrief: nav.brief, onChat: nav.chat, onItem: nav.item }),
    [nav],
  );
  const itemText = (text: string) => (
    <ReactMarkdown components={components}>{linkBareItemIds(text) || "*(empty)*"}</ReactMarkdown>
  );
  const item = (id: string, text: string, kind: "requirement" | "decision" | "assumption") => (
    <div className="markdown-body judged-item">
      <span className={`simple-id-chip${kind === "requirement" ? "" : ` simple-id-chip-${kind}`}`}>{id}</span>{" "}
      {itemText(text)}
    </div>
  );
  const alikeTo = (kinds: SimilarKind[], id: string): Alike[] =>
    soundness.similar
      .filter((group) => kinds.includes(group.kind) && group.ids.includes(id))
      .map((group) => ({ group, others: group.ids.filter((other) => other !== id) }));
  const onAlike = (kind: SimilarKind, id: string) => (kind === "sketches" ? nav.sketch(id) : nav.item(id));

  const showSketch = (decision: ParsedDecision) =>
    nav.diagram({
      nodes: decision.sketch?.nodes.map((node) => node.id) ?? [],
      edges: decision.sketch?.edges ?? [],
    });
  const sketch = (decision: ParsedDecision) =>
    hasSketch(decision) && !decision.sketch?.parseError ? (
      <div
        className="simple-sketch report-sketch-clickable"
        role="button"
        tabIndex={0}
        title="Find it among the components on the design doc"
        onClick={(event) => {
          // A box on its own, or else everything this sketch draws.
          const nodeId = nodeIdAt(event.target);
          if (nodeId) nav.node(nodeId);
          else showSketch(decision);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          showSketch(decision);
        }}
      >
        <MermaidBlock chart={decision.sketchCode ?? ""} />
      </div>
    ) : (
      <div className="simple-sketch-empty">{decision.sketch?.parseError ?? "No sketch."}</div>
    );
  const sketchNotRated = (decision: ParsedDecision) =>
    decision.sketch?.parseError ? "the sketch doesn't parse" : "no sketch";

  const requirements = parsed.requirements.filter((requirement) => requirement.text.trim());
  const sketched = usableSketches(parsed.decisions);
  const finalIds = new Set(parsed.final.nodes.map((node) => node.id));
  const ratings = {
    requirementItems: byId(soundness.requirementItems),
    decisionItems: byId(soundness.decisionItems),
    sketchItems: byId(soundness.sketchItems),
    requirements: byId(soundness.requirements),
    decisions: byId(soundness.decisions),
    sketches: byId(soundness.sketches),
    sketchIntegration: byId(soundness.sketchIntegration),
  };
  const empty = (what: string) => <div className="report-note">No {what}.</div>;

  /** What hovering the web shows: the AI's critique of an item on its own, or of a link. */
  const nodeTip = (node: WebNode) => {
    const id = node.key.slice(node.key.indexOf(":") + 1);
    if (node.column === "requirement") return <Critique label="On its own" rating={ratings.requirementItems.get(id)} />;
    if (node.column === "decision") return <Critique label="On its own" rating={ratings.decisionItems.get(id)} />;
    if (node.column === "design") return <Critique label="Sketch on its own" rating={ratings.sketchItems.get(id)} />;
    return null;
  };
  const edgeTip = (edge: WebEdge) => {
    const { judges, from, to } = edge as SoundnessEdge;
    const label = (key: string) => graph.nodes.find((node) => node.key === key)?.label ?? key;
    const title = `${label(from)}${from.startsWith("sketch:") ? " sketch" : ""} → ${label(to)}${to.startsWith("sketch:") ? " sketch" : ""}`;
    const critique =
      judges === "quote" ? (
        <Critique label="Against its quote" rating={ratings.requirements.get(to.slice(4))} />
      ) : judges === "requirements" ? (
        <Critique label="Against its requirements" rating={ratings.decisions.get(to.slice(4))} />
      ) : judges === "decision" ? (
        <Critique label="Against its decision" rating={ratings.sketches.get(to.slice(7))} />
      ) : (
        <Critique label="Into the diagram" rating={ratings.sketchIntegration.get(from.slice(7))} />
      );
    return (
      <>
        <div>
          <strong>{title}</strong>
        </div>
        {critique}
      </>
    );
  };

  return (
    <ReportLayer
      layerId="level-2"
      level="Level 2"
      title="Soundness"
      question="Does it make sense? The AI judges each requirement, decision and sketch on its own, each link against what it cites, and how each sketch fits into the final diagram."
      method="AI judgment"
    >
      <div className="report-web">
        <h4 className="report-web-title">Soundness of references</h4>
        <div className="report-cell-subtitle">
          Each item is coloured by the AI's judgment of it on its own; each link by its judgment of that link. Hover
          either to read the critique.
        </div>
        {graph.nodes.length === 0 ? (
          empty("requirements or decisions")
        ) : (
          <FlowWeb
            graph={graph}
            columns={COLUMNS}
            defaultAnchor="requirement"
            nav={nav}
            fill={(node) => TONE_COLORS[node.tone as SoundnessTone]}
            edgeColor={(edge) => TONE_COLORS[edge.tone as SoundnessTone] ?? "#94a3b8"}
            nodeTip={nodeTip}
            edgeTip={edgeTip}
            hint="Hover an item or a link to see the AI's critique. Click a node to light up its web; click a heading to sort by it."
            legend={
              <>
                {(["sound", "weak", "unsound", "unrated"] as const).map((tone) => (
                  <span key={tone} className="flow-graph-legend-item">
                    <span className="flow-graph-swatch" style={{ background: TONE_COLORS[tone] }} />
                    {tone === "unrated" ? "Not rated" : RATING_LABEL[tone]}
                  </span>
                ))}
              </>
            }
          />
        )}
      </div>

      <ReportSection
        sectionId={GROUPS.requirements}
        title="Requirements"
        question="Does each requirement say what its quote says, and is it clear and testable on its own?"
      >
        {requirements.length === 0 && empty("requirements")}
        {requirements.map((requirement) => (
          <JudgedRow
            key={`${requirement.id}-${requirement.line}`}
            caseId={caseId}
            onAlike={onAlike}
            alike={alikeTo(["requirements"], requirement.id)}
            pairs={[
              {
                id: `req-${requirement.id}-quote`,
                work: (
                  <Cites label="Its quote">
                    {requirement.citations.length === 0 && <div className="judged-none">No quote cited.</div>}
                    {requirement.citations.map((citation, index) => (
                      <div key={index} className={citation.valid ? "judged-quote" : "judged-quote is-unverified"}>
                        “{citation.excerpt}”{" "}
                        {citation.source === "chat" && citation.messageIndex !== undefined ? (
                          <ChatRef index={citation.messageIndex} quote={citation.excerpt} onChat={nav.chat} />
                        ) : (
                          <button
                            type="button"
                            className="report-link inline-ref"
                            onClick={() => nav.brief(citation.excerpt)}
                          >
                            Brief
                          </button>
                        )}
                        {!citation.valid && <span className="judged-flag"> quote not found</span>}
                      </div>
                    ))}
                  </Cites>
                ),
                checks: [
                  {
                    label: "Against its quote",
                    rating: ratings.requirements.get(requirement.id),
                    feedbackItem: `requirement:${requirement.id}`,
                  },
                ],
              },
              {
                id: `req-${requirement.id}-own`,
                work: item(requirement.id, requirement.text, "requirement"),
                checks: [
                  {
                    label: "On its own",
                    rating: ratings.requirementItems.get(requirement.id),
                    feedbackItem: `requirement-item:${requirement.id}`,
                  },
                ],
              },
            ]}
          />
        ))}
        {parsed.assumptions.length > 0 && (
          <div className="judged-assumptions">
            <h5 className="report-group-title">Assumptions (not rated)</h5>
            {parsed.assumptions.map((assumption) => (
              <div key={`${assumption.id}-${assumption.line}`}>{item(assumption.id, assumption.text, "assumption")}</div>
            ))}
          </div>
        )}
      </ReportSection>

      <ReportSection
        sectionId={GROUPS.decisions}
        title="Decisions"
        question="For each decision: does it follow from its requirements, is it a workable choice with an honest trade-off, and does its sketch draw it clearly?"
      >
        {parsed.decisions.length === 0 && empty("decisions")}
        {parsed.decisions.map((decision) => (
          <JudgedRow
            key={`${decision.id}-${decision.line}`}
            caseId={caseId}
            onAlike={onAlike}
            alike={alikeTo(["decisions", "sketches"], decision.id)}
            pairs={[
              {
                id: `dec-${decision.id}-requirements`,
                work: (
                  <Cites label="Its requirements">
                    {decision.requirementIds.length === 0 ? (
                      <div className="judged-none">Cites no requirement.</div>
                    ) : (
                      <div className="report-ref-list">
                        {decision.requirementIds.map((id) => (
                          <div key={id}>
                            <ItemRef id={id} onClick={nav.item} withText />
                          </div>
                        ))}
                      </div>
                    )}
                  </Cites>
                ),
                checks: [
                  {
                    label: "Against its requirements",
                    rating: ratings.decisions.get(decision.id),
                    feedbackItem: `decision:${decision.id}`,
                  },
                ],
              },
              {
                id: `dec-${decision.id}-own`,
                work: item(decision.id, decision.text, "decision"),
                checks: [
                  {
                    label: "On its own",
                    rating: ratings.decisionItems.get(decision.id),
                    feedbackItem: `decision-item:${decision.id}`,
                  },
                ],
              },
              {
                id: `dec-${decision.id}-sketch`,
                work: (
                  <>
                    <div className="judged-label">Its sketch</div>
                    {sketch(decision)}
                  </>
                ),
                checks: [
                  {
                    label: "Against its decision",
                    rating: ratings.sketches.get(decision.id),
                    feedbackItem: `sketch:${decision.id}`,
                    notRated: sketchNotRated(decision),
                  },
                  {
                    label: "Sketch on its own",
                    rating: ratings.sketchItems.get(decision.id),
                    feedbackItem: `sketch-item:${decision.id}`,
                    notRated: sketchNotRated(decision),
                  },
                ],
              },
            ]}
          />
        ))}
      </ReportSection>

      <ReportSection
        sectionId={GROUPS.diagram}
        title="Diagram"
        question="Does it make sense to put each sketch into the final diagram: joined where it belongs, meaning unchanged?"
      >
        {sketched.length === 0 && empty("sketches")}
        {sketched.map((decision) => {
          const parts = decision.sketch!.nodes.filter((node) => !node.isActor);
          const inFinal = parts.filter((node) => finalIds.has(node.id));
          const missing = parts.filter((node) => !finalIds.has(node.id));
          return (
            <JudgedRow
              key={`${decision.id}-${decision.line}`}
              caseId={caseId}
              onAlike={onAlike}
              pairs={[
                {
                  id: `diagram-${decision.id}`,
                  work: (
                    <>
                      <div className="judged-label">
                        <ItemRef id={decision.id} onClick={nav.sketch} /> sketch
                      </div>
                      {sketch(decision)}
                      <Cites label="Its components in the final diagram">
                        {inFinal.length === 0 && <div className="judged-none">None of them.</div>}
                        <div className="report-box-refs">
                          {inFinal.map((node) => (
                            <BoxRef key={node.id} node={node.id} onClick={() => nav.node(node.id)} withText />
                          ))}
                        </div>
                        {missing.length > 0 && (
                          <div className="judged-flag">
                            Not in the final diagram: {missing.map((node) => node.label).join(", ")}
                          </div>
                        )}
                      </Cites>
                    </>
                  ),
                  checks: [
                    {
                      label: "Into the diagram",
                      rating: ratings.sketchIntegration.get(decision.id),
                      feedbackItem: `sketch-integration:${decision.id}`,
                    },
                  ],
                },
              ]}
            />
          );
        })}
      </ReportSection>
    </ReportLayer>
  );
}
