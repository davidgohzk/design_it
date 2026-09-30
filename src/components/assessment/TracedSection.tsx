import type { CaseDefinition } from "../../cases";
import { FUNNEL_ORDER } from "../../assessment/types";
import type { AssessmentResult, FunnelState } from "../../assessment/types";
import { FeedbackButtons } from "./FeedbackButtons";
import { FUNNEL_LABELS } from "./reportData";
import type { ReportNav } from "./reportTypes";

const FUNNEL_COLORS: Record<FunnelState, string> = {
  carried_through: "#16a34a",
  not_drawn: "#f59e0b",
  unused: "#f97316",
  dropped: "#ef4444",
  assumed: "#a855f7",
  missed: "#b91c1c",
  client_failed: "#94a3b8",
  given: "#cbd5e1",
};

type ListRow = { key: string; label: string; onClick: () => void };

function TraceList({
  title,
  explain,
  rows,
  caseId,
}: {
  title: string;
  explain: string;
  rows: ListRow[];
  caseId: string;
}) {
  return (
    <section>
      <h4 className="report-group-title">
        {title} ({rows.length})
      </h4>
      {rows.length === 0 ? (
        <div className="report-list-empty">✓ None</div>
      ) : (
        <>
          <div className="report-row-detail" style={{ fontSize: "0.82rem", marginBottom: 6 }}>
            {explain}
          </div>
          {rows.map((row) => (
            <div key={row.key} className="report-row">
              <div className="report-row-main">
                <button type="button" className="report-list-item" onClick={row.onClick}>
                  {row.label}
                </button>
              </div>
              <FeedbackButtons caseId={caseId} item={`traced:${title}:${row.key}`} />
            </div>
          ))}
        </>
      )}
    </section>
  );
}

export function TracedSection({
  result,
  caseDefinition,
  nav,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  nav: ReportNav;
}) {
  const { links } = result;
  const facts = caseDefinition.facts;
  const counts = new Map<FunnelState, number>();
  for (const fact of facts) counts.set(links.funnel[fact.id], (counts.get(links.funnel[fact.id]) ?? 0) + 1);
  const foundById = new Map(result.found.facts.map((fact) => [fact.factId, fact]));
  const label = (factId: string) => facts.find((fact) => fact.id === factId)?.label ?? factId;
  const ids = (list: string[], go: (id: string) => void): ListRow[] =>
    list.map((id) => ({ key: id, label: id, onClick: () => go(id) }));

  return (
    <div>
      <h4 className="report-group-title">Where each fact ended up</h4>
      <div className="report-funnel">
        {FUNNEL_ORDER.filter((state) => counts.get(state)).map((state) => (
          <div key={state} className="report-funnel-row">
            <span>{FUNNEL_LABELS[state]}</span>
            <div className="report-funnel-track">
              <div
                className="report-funnel-bar"
                style={{
                  width: `${((counts.get(state) ?? 0) / facts.length) * 100}%`,
                  background: FUNNEL_COLORS[state],
                }}
              />
            </div>
            <span className="report-funnel-count">{counts.get(state)}</span>
          </div>
        ))}
      </div>
      <div className="report-list-items" style={{ marginTop: 8 }}>
        {facts.map((fact) => (
          <span key={fact.id} className="report-chip" title={fact.detail}>
            {fact.label}: {FUNNEL_LABELS[links.funnel[fact.id]]}
          </span>
        ))}
      </div>

      <TraceList
        title="Dropped facts"
        explain="The client told you these, but no requirement cites them."
        caseId={caseDefinition.id}
        rows={links.dropped.map((factId) => {
          const found = foundById.get(factId);
          return {
            key: factId,
            label: label(factId),
            onClick: () => found?.messageIndex !== undefined && nav.chat(found.messageIndex, found.quote),
          };
        })}
      />
      <TraceList
        title="Hidden assumptions"
        explain="Requirements stated as fact with no citation and not listed under Assumptions."
        caseId={caseDefinition.id}
        rows={ids(links.hiddenAssumptions, nav.item)}
      />
      <TraceList
        title="Unverified citations"
        explain="Requirements whose quotes aren't in the chat or the brief."
        caseId={caseDefinition.id}
        rows={ids(links.uncited, nav.item)}
      />
      <TraceList
        title="Unused requirements"
        explain="No decision says it is because of these."
        caseId={caseDefinition.id}
        rows={ids(links.unused, nav.item)}
      />
      <TraceList
        title="Unsupported decisions"
        explain="These cite no requirement that exists."
        caseId={caseDefinition.id}
        rows={ids(links.unsupported, nav.item)}
      />
      <TraceList
        title="Not drawn"
        explain="Decisions with no sketch, or whose sketch isn't in the final diagram."
        caseId={caseDefinition.id}
        rows={ids(links.notDrawn, nav.sketch)}
      />
      <TraceList
        title="Unexplained boxes"
        explain="Boxes in the final diagram that no decision's sketch contains."
        caseId={caseDefinition.id}
        rows={ids(links.unjustified, nav.node)}
      />
      <TraceList
        title="Unexplained connections"
        explain="Connections in the final diagram that no sketch shows."
        caseId={caseDefinition.id}
        rows={links.unexplainedEdges.map((edge) => ({
          key: `${edge.from}->${edge.to}`,
          label: `${edge.from} → ${edge.to}`,
          onClick: () => nav.node(edge.from),
        }))}
      />
    </div>
  );
}
