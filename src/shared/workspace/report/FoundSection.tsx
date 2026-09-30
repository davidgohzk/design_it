import type { CaseDefinition, CaseFact } from "../../../cases";
import type { AssessmentResult, FactState, FoundFact } from "../../../assessment/types";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import { normalizeEvidence } from "../../lib/evidence";
import { FeedbackButtons } from "./FeedbackButtons";
import { ChatRef, ItemRef } from "./ReportLayer";
import type { ReportNav } from "./reportTypes";

// Client failures are level 0 and shown there.
const GROUPS: { state: FactState; title: string }[] = [
  { state: "missed", title: "Missed" },
  { state: "assumed", title: "Assumed, not asked" },
  { state: "surfaced", title: "Found in the chat" },
];

/** The doc items (R#, A#, D#) whose text contains a quote from the doc. */
function itemsQuoting(parsed: ParsedDesignDoc, quote: string) {
  const needle = normalizeEvidence(quote);
  return [...parsed.requirements, ...parsed.assumptions, ...parsed.decisions]
    .filter((item) => needle && normalizeEvidence(item.text).includes(needle))
    .map((item) => item.id);
}

const Refs = ({ ids, nav }: { ids: string[]; nav: ReportNav }) => (
  <>
    {ids.map((id) => (
      <span key={id}>
        {" "}
        <ItemRef id={id} onClick={nav.item} />
      </span>
    ))}
  </>
);

/** Requirements listed on their own lines, each with its words. */
const RefLines = ({ ids, nav }: { ids: string[]; nav: ReportNav }) => (
  <div className="report-ref-list">
    {ids.map((id) => (
      <div key={id}>
        <ItemRef id={id} onClick={nav.item} withText />
      </div>
    ))}
  </div>
);

function FactRow({
  fact,
  found,
  requirements,
  parsed,
  caseId,
  nav,
}: {
  fact: CaseFact;
  found: FoundFact;
  /** Surfaced facts: the requirements that cite the quote that surfaced them. */
  requirements: string[];
  parsed: ParsedDesignDoc;
  caseId: string;
  nav: ReportNav;
}) {
  const showWhy = found.state === "missed" || found.state === "assumed";
  return (
    <div className="report-row">
      <div className="report-row-main">
        <span className="report-row-title">{fact.label}</span>
        <span className={fact.disclosure === "on-probe" ? "report-chip report-chip-probe" : "report-chip"}>
          {fact.disclosure}
        </span>
        <div className="report-row-detail">{fact.detail}</div>
        {showWhy && fact.whyItMatters && <div className="report-why">Why it matters: {fact.whyItMatters}</div>}
        {found.state === "assumed" && found.quote && (
          <div className="report-quote">
            Your doc says: “{found.quote}”
            <Refs ids={itemsQuoting(parsed, found.quote)} nav={nav} />
          </div>
        )}
        {found.state === "surfaced" && found.messageIndex !== undefined && (
          <>
            <div className="report-quote">
              “{found.quote}” <ChatRef index={found.messageIndex} quote={found.quote} onChat={nav.chat} />
            </div>
            {requirements.length > 0 ? (
              <div className="report-fact-refs">
                In your requirements:
                <RefLines ids={requirements} nav={nav} />
              </div>
            ) : (
              <div className="report-fact-refs is-missing">Not in any requirement: dropped after the chat.</div>
            )}
          </>
        )}
      </div>
      <FeedbackButtons caseId={caseId} item={`found:${fact.id}`} />
    </div>
  );
}

/**
 * Level 1A: which hidden facts were found, missed or assumed, each traced to the requirement that
 * records it. Found facts are listed in design order: by the first requirement that cites them.
 */
export function FoundSection({
  result,
  caseDefinition,
  parsed,
  nav,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  parsed: ParsedDesignDoc;
  nav: ReportNav;
}) {
  const foundById = new Map(result.found.facts.map((fact) => [fact.factId, fact]));
  const given = caseDefinition.facts.filter((fact) => fact.disclosure === "given");
  const requirementsOf = (factId: string) => result.links.paths[factId]?.requirements ?? [];
  const requirementOrder = new Map(parsed.requirements.map((item, index) => [item.id, index]));
  const designOrder = (fact: CaseFact) => {
    const ids = requirementsOf(fact.id);
    return ids.length ? Math.min(...ids.map((id) => requirementOrder.get(id) ?? 0)) : Number.MAX_SAFE_INTEGER;
  };
  return (
    <div>
      {GROUPS.map(({ state, title }) => {
        const facts = caseDefinition.facts
          .filter((fact) => fact.disclosure !== "given" && foundById.get(fact.id)?.state === state)
          // Stable sort: facts no requirement cites keep the case order, after the rest.
          .sort((a, b) => designOrder(a) - designOrder(b));
        if (facts.length === 0) return null;
        return (
          <section key={state}>
            <h5 className="report-group-title">
              {title} ({facts.length})
            </h5>
            {facts.map((fact) => (
              <FactRow
                key={fact.id}
                fact={fact}
                found={foundById.get(fact.id)!}
                requirements={requirementsOf(fact.id)}
                parsed={parsed}
                caseId={caseDefinition.id}
                nav={nav}
              />
            ))}
          </section>
        );
      })}
      {given.length > 0 && (
        <details>
          <summary className="report-group-title">Given in the brief ({given.length})</summary>
          {given.map((fact) => (
            <div key={fact.id} className="report-row">
              <div className="report-row-main">
                <span className="report-row-title">{fact.label}</span>
                <div className="report-row-detail">{fact.detail}</div>
              </div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
