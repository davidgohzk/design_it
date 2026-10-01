import type { ReactNode } from "react";
import type { CaseDefinition } from "../../../cases";
import type { AssessmentResult } from "../../../assessment/types";
import { BoxRef, ChatRef, ItemRef, LayerCell, LayerCols } from "./ReportLayer";
import type { ReportNav } from "./reportTypes";

type ListRow = { key: string; content: ReactNode };

function TraceList({ title, explain, rows }: { title: string; explain: string; rows: ListRow[] }) {
  return (
    <section>
      <h5 className="report-group-title">
        {title} ({rows.length})
      </h5>
      {rows.length === 0 ? (
        <div className="report-list-empty">✓ None</div>
      ) : (
        <>
          <div className="report-row-detail" style={{ fontSize: "0.82rem", marginBottom: 6 }}>
            {explain}
          </div>
          {rows.map((row) => (
            <div key={row.key} className="report-row">
              <div className="report-row-main">{row.content}</div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

const Direction = ({ children, method }: { children: string; method?: string }) => (
  <div className="report-direction">
    {children}
    {method && <span className="report-method">{method}</span>}
  </div>
);

/**
 * Level 1B: does every link in the chain exist, forward (carried on) and backward (has an origin)?
 * Code only: a link is a reference, and the same doc always gives the same answer.
 */
export function LinksSection({
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
  const foundById = new Map(result.found.facts.map((fact) => [fact.factId, fact]));
  const label = (factId: string) => facts.find((fact) => fact.id === factId)?.label ?? factId;
  const ids = (list: string[], go: (id: string) => void): ListRow[] =>
    list.map((id) => ({ key: id, content: <ItemRef id={id} onClick={go} withText /> }));

  return (
    <LayerCols>
      <LayerCell title="A. Source → Requirements">
        <Direction method="Code">Forward: lost along the way</Direction>
        <TraceList
          title="Dropped facts"
          explain="The client told you these, but no requirement cites them."
          rows={links.dropped.map((factId) => {
            const found = foundById.get(factId);
            return {
              key: factId,
              content: (
                <>
                  <span className="report-row-title">{label(factId)}</span>{" "}
                  {found?.messageIndex !== undefined && (
                    <ChatRef index={found.messageIndex} quote={found.quote} onChat={nav.chat} />
                  )}
                </>
              ),
            };
          })}
        />
        <Direction method="Code">Backward: no origin</Direction>
        <TraceList
          title="Hidden assumptions"
          explain="Requirements stated as fact with no citation and not listed under Assumptions."
          rows={ids(links.hiddenAssumptions, nav.item)}
        />
        <TraceList
          title="Unverified citations"
          explain="Requirements whose quotes aren't in the chat or the brief."
          rows={ids(links.uncited, nav.item)}
        />
      </LayerCell>

      <LayerCell title="B. Requirements → Decisions">
        <Direction method="Code">Forward: lost along the way</Direction>
        <TraceList
          title="Unused requirements"
          explain="No decision says it is because of these."
          rows={ids(links.unused, nav.item)}
        />
        <Direction method="Code">Backward: no origin</Direction>
        <TraceList
          title="Unsupported decisions"
          explain="These cite no requirement that exists."
          rows={ids(links.unsupported, nav.item)}
        />
      </LayerCell>

      <LayerCell
        title="C. Decisions → Components"
        subtitle="To see which decision draws which component, switch the decision colours on the design doc on the left."
      >
        <Direction method="Code">Forward: lost along the way</Direction>
        <TraceList
          title="Not drawn"
          explain="Decisions with no sketch, or whose sketch isn't among the components."
          rows={ids(links.notDrawn, nav.sketch)}
        />
        <Direction method="Code">Backward: no origin</Direction>
        <TraceList
          title="Unexplained components"
          explain="Components that no decision's sketch contains."
          rows={links.unjustified.map((nodeId) => ({
            key: nodeId,
            content: <BoxRef node={nodeId} onClick={() => nav.node(nodeId)} withText />,
          }))}
        />
        <TraceList
          title="Unexplained connections"
          explain="Connections between components that no sketch shows."
          rows={links.unexplainedEdges.map((edge) => ({
            key: `${edge.from}->${edge.to}`,
            content: <BoxRef edge={edge} onClick={() => nav.edge(edge.from, edge.to)} withText />,
          }))}
        />
      </LayerCell>
    </LayerCols>
  );
}
