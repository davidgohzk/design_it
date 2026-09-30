import type { CaseDefinition, CaseFact } from "../../cases";
import type { AssessmentResult, FactState, FoundFact } from "../../assessment/types";
import { FeedbackButtons } from "./FeedbackButtons";
import type { ReportNav } from "./reportTypes";

const GROUPS: { state: FactState; title: string }[] = [
  { state: "missed", title: "Missed" },
  { state: "assumed", title: "Assumed, not asked" },
  { state: "surfaced", title: "Found in the chat" },
  { state: "client_failed", title: "Excluded: you asked, but the client didn't answer" },
];

function FactRow({
  fact,
  found,
  caseId,
  nav,
}: {
  fact: CaseFact;
  found: FoundFact;
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
          <div className="report-quote">Your doc says: “{found.quote}”</div>
        )}
        {(found.state === "surfaced" || found.state === "client_failed") && found.messageIndex !== undefined && (
          <div className="report-quote">
            {found.state === "client_failed" ? "You asked: " : ""}“{found.quote}”{" "}
            <button
              type="button"
              className="report-link inline-ref inline-ref-chat"
              onClick={() => nav.chat(found.messageIndex!, found.quote)}
            >
              Chat #{found.messageIndex}
            </button>
          </div>
        )}
      </div>
      <FeedbackButtons caseId={caseId} item={`found:${fact.id}`} />
    </div>
  );
}

export function FoundSection({
  result,
  caseDefinition,
  nav,
  showFairnessDetails = false,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  nav: ReportNav;
  /** Research mode: level 0 details (client statements that match no fact). */
  showFairnessDetails?: boolean;
}) {
  const foundById = new Map(result.found.facts.map((fact) => [fact.factId, fact]));
  const given = caseDefinition.facts.filter((fact) => fact.disclosure === "given");
  return (
    <div>
      {GROUPS.map(({ state, title }) => {
        const facts = caseDefinition.facts.filter(
          (fact) => fact.disclosure !== "given" && foundById.get(fact.id)?.state === state,
        );
        if (facts.length === 0) return null;
        return (
          <section key={state}>
            <h4 className="report-group-title">
              {title} ({facts.length})
            </h4>
            {facts.map((fact) => (
              <FactRow key={fact.id} fact={fact} found={foundById.get(fact.id)!} caseId={caseDefinition.id} nav={nav} />
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
      {showFairnessDetails && (
        <section>
          <h4 className="report-group-title">Level 0: client statements that match no case fact</h4>
          {result.fairness.inventedStatements.length === 0 && (
            <div className="report-list-empty">None: the client stayed within the case facts.</div>
          )}
        </section>
      )}
      {showFairnessDetails && result.fairness.inventedStatements.length > 0 && (
        <section>
          {result.fairness.inventedStatements.map((statement, index) => (
            <div key={index} className="report-row">
              <div className="report-row-main report-quote">
                “{statement.quote}”{" "}
                <button
                  type="button"
                  className="report-link inline-ref inline-ref-chat"
                  onClick={() => nav.chat(statement.messageIndex, statement.quote)}
                >
                  Chat #{statement.messageIndex}
                </button>
              </div>
              <FeedbackButtons caseId={caseDefinition.id} item={`invented:${statement.messageIndex}:${statement.quote}`} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
