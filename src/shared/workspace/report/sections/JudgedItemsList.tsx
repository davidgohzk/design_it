import { useMemo } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { CaseDefinition } from "../../../../cases";
import type { RationaleLink } from "../../../../assessment/summaryReview";
import type { AssessmentResult } from "../../../../assessment/types";
import { usableSketches } from "../../../../designDoc/consistency";
import { hasSketch } from "../../../../designDoc/parse";
import type { ParsedDecision, ParsedDesignDoc } from "../../../../designDoc/parse";
import { MermaidBlock } from "../../../components/MermaidBlock";
import { citationComponents } from "../../panels/citationLinks";
import type { CitationHandlers } from "../../panels/citationLinks";
import { FeedbackButtons } from "../FeedbackButtons";
import { ChatRef, ItemRef, ReportSection } from "../ReportLayer";

/** One judgment of a piece of the work: what was judged, the verdict and why. */
type Check = {
  label: string;
  verdict?: string;
  reason?: string;
  quote?: string;
  feedbackItem: string;
  /** Why there is no verdict, when there cannot be one. */
  notJudged?: string;
};

/** One line of a row: a piece of the work, beside the judgments of it. */
type Pair = { id: string; work: ReactNode; checks: Check[] };

const VERDICT_LABEL: Record<string, string> = {
  sound: "sound",
  weak: "weak",
  unsound: "unsound",
  uncertain: "could not be verified",
  skipped_lint: "not judged",
};

/** One judgment, under its label: the verdict and why, or why there is none. */
function CheckCell({ check, caseId }: { check: Check; caseId: string }) {
  return (
    <div className="judged-check">
      <div className="judged-label">{check.label}</div>
      {check.verdict ? (
        <div className="judged-line">
          <span className="judged-text">
            <span className={`report-rating report-rating-${check.verdict}`}>{VERDICT_LABEL[check.verdict] ?? check.verdict}</span>
            <span className="report-rating-reason">{check.reason}</span>
            {check.quote && <div className="judged-quote">“{check.quote}”</div>}
          </span>
          <FeedbackButtons caseId={caseId} item={check.feedbackItem} />
        </div>
      ) : (
        <div className="judged-none">Not judged{check.notJudged ? `: ${check.notJudged}` : "."}</div>
      )}
    </div>
  );
}

/**
 * One row, as aligned pairs: each piece of the work beside the judgments of it. Each pair starts on
 * the same line, however long either side runs.
 */
function JudgedRow({ pairs, caseId }: { pairs: Pair[]; caseId: string }) {
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
 * The reasoning, item by item: each piece of the work on the left and the judgments of it on the
 * right — requirements against their quotes, decisions with their requirements and their sketch, and
 * each sketch placed into the final diagram.
 */
export function JudgedItemsList({
  result,
  caseDefinition,
  doc,
  citation,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  doc: ParsedDesignDoc;
  citation: CitationHandlers;
}) {
  const caseId = caseDefinition.id;
  const components = useMemo(() => citationComponents(citation), [citation]);
  const itemVerdict = new Map(result.justify.items.map((item) => [item.itemId, item]));
  const links = new Map((result.rationale ?? []).map((link) => [link.id, link]));

  /** The judgments of one link of the chain, keyed the way rationaleEvidence keys them. */
  const linkCheck = (label: string, id: string, feedbackItem: string): Check => {
    const link: RationaleLink | undefined = links.get(id);
    if (!link) return { label, feedbackItem, notJudged: "this link was not in the chain" };
    return { label, verdict: link.verdict, reason: link.reason, ...(link.quote ? { quote: link.quote } : {}), feedbackItem };
  };
  const ownCheck = (label: string, id: string, feedbackItem: string, notJudged?: string): Check => {
    const item = itemVerdict.get(id);
    if (!item) return { label, feedbackItem, ...(notJudged ? { notJudged } : {}) };
    return { label, verdict: item.verdict, reason: item.reason, feedbackItem };
  };

  const itemText = (text: string) => <ReactMarkdown components={components}>{text || "*(empty)*"}</ReactMarkdown>;
  const item = (id: string, text: string, kind: "requirement" | "decision") => (
    <div className="markdown-body judged-item">
      <span className={`simple-id-chip${kind === "requirement" ? "" : ` simple-id-chip-${kind}`}`}>{id}</span> {itemText(text)}
    </div>
  );

  const sketch = (decision: ParsedDecision) =>
    hasSketch(decision) && !decision.sketch?.parseError ? (
      <div className="simple-sketch report-sketch-clickable">
        <MermaidBlock chart={decision.sketchCode ?? ""} />
      </div>
    ) : (
      <div className="simple-sketch-empty">{decision.sketch?.parseError ?? "No sketch."}</div>
    );

  const requirements = doc.requirements.filter((requirement) => requirement.text.trim());
  const sketched = new Set(usableSketches(doc.decisions).map((decision) => decision.id));
  const finalIds = new Set(doc.final.nodes.map((node) => node.id));
  const empty = (what: string) => <div className="report-note">No {what}.</div>;

  return (
    <>
      <ReportSection
        sectionId="rationale-requirements"
        title="Requirements"
        question="Does each requirement say what its quote says, and does it hold up on its own?"
      >
        {requirements.length === 0 && empty("requirements")}
        {requirements.map((requirement) => {
          const first = requirement.citations.find((citation) => citation.valid);
          const linkId = first
            ? `${first.source === "brief" ? "brief" : `chat:${first.messageIndex}`}>${requirement.id}`
            : "";
          return (
            <JudgedRow
              key={`${requirement.id}-${requirement.line}`}
              caseId={caseId}
              pairs={[
                {
                  id: `req-${requirement.id}-quote`,
                  work: (
                    <Cites label="Its quote">
                      {requirement.citations.length === 0 && <div className="judged-none">No quote cited.</div>}
                      {requirement.citations.map((cite, index) => (
                        <div key={index} className={cite.valid ? "judged-quote" : "judged-quote is-unverified"}>
                          “{cite.excerpt}”{" "}
                          {cite.source === "chat" && cite.messageIndex !== undefined ? (
                            <ChatRef index={cite.messageIndex} quote={cite.excerpt} onChat={citation.onChat} />
                          ) : (
                            <button type="button" className="report-link inline-ref inline-ref-cs" onClick={() => citation.onBrief(cite.excerpt)}>
                              Brief
                            </button>
                          )}
                          {!cite.valid && <span className="judged-flag"> quote not found</span>}
                        </div>
                      ))}
                    </Cites>
                  ),
                  checks: [linkCheck("Against its quote", linkId, `rationale:${requirement.id}`)],
                },
                {
                  id: `req-${requirement.id}-own`,
                  work: item(requirement.id, requirement.text, "requirement"),
                  checks: [ownCheck("On its own", requirement.id, `justify:${requirement.id}`, "it was not sent to the judge")],
                },
              ]}
            />
          );
        })}
      </ReportSection>

      <ReportSection
        sectionId="rationale-decisions"
        title="Decisions"
        question="For each decision: does it follow from its requirements, and does its sketch draw it and reach the final diagram?"
      >
        {doc.decisions.length === 0 && empty("decisions")}
        {doc.decisions.map((decision) => {
          const drawn = (decision.sketch?.nodes ?? []).filter((node) => !node.isActor && finalIds.has(node.id));
          return (
            <JudgedRow
              key={`${decision.id}-${decision.line}`}
              caseId={caseId}
              pairs={[
                {
                  id: `dec-${decision.id}-requirements`,
                  work: (
                    <Cites label="Its requirements">
                      {decision.because.length === 0 ? (
                        <div className="judged-none">Cites no requirement.</div>
                      ) : (
                        <div className="report-ref-list">
                          {decision.because.map((id) => (
                            <div key={id}>
                              <ItemRef id={id} onClick={citation.onItem} withText />
                            </div>
                          ))}
                        </div>
                      )}
                    </Cites>
                  ),
                  checks: decision.because.length
                    ? decision.because.map((id) => linkCheck(`Against ${id}`, `${id}>${decision.id}`, `rationale:${id}>${decision.id}`))
                    : [{ label: "Against its requirements", feedbackItem: `rationale:${decision.id}`, notJudged: "it cites no requirement" }],
                },
                {
                  id: `dec-${decision.id}-own`,
                  work: item(decision.id, decision.text, "decision"),
                  checks: [ownCheck("On its own", decision.id, `justify:${decision.id}`, "it was not sent to the judge")],
                },
                {
                  id: `dec-${decision.id}-sketch`,
                  work: sketch(decision),
                  checks: [
                    linkCheck("Against its decision", `${decision.id}>${decision.id}-sketch`, `rationale:${decision.id}-sketch`),
                    ...(sketched.has(decision.id)
                      ? drawn.map((node) =>
                          linkCheck(`Into the diagram as ${node.id}`, `${decision.id}-sketch>${node.id}`, `rationale:${decision.id}-sketch>${node.id}`),
                        )
                      : []),
                    ...(sketched.has(decision.id) && drawn.length === 0
                      ? [{ label: "Into the diagram", feedbackItem: `diagram:${decision.id}`, notJudged: "none of its boxes is in the final diagram" }]
                      : []),
                  ],
                },
              ]}
            />
          );
        })}
      </ReportSection>
    </>
  );
}
