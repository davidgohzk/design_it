import type { ReactNode } from "react";
import type { CaseDefinition } from "../../../cases";
import type { AssessmentResult } from "../../../assessment/types";
import { FactGraph } from "./FactGraph";
import { FeedbackButtons } from "./FeedbackButtons";
import { BoxRef, ChatRef, ItemRef, LayerCell, LayerCols, ReportLayer } from "./ReportLayer";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

type ListRow = { key: string; content: ReactNode };

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
              <FeedbackButtons caseId={caseId} item={`traced:${title}:${row.key}`} />
            </div>
          ))}
        </>
      )}
    </section>
  );
}

const Direction = ({ children }: { children: string }) => <div className="report-direction">{children}</div>;

/** Level 2: does every link in the chain exist, forward (carried on) and backward (has an origin)? */
export function LinksLayer({
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
  const { links } = result;
  const caseId = caseDefinition.id;
  const facts = caseDefinition.facts;
  const foundById = new Map(result.found.facts.map((fact) => [fact.factId, fact]));
  const label = (factId: string) => facts.find((fact) => fact.id === factId)?.label ?? factId;
  const ids = (list: string[], go: (id: string) => void): ListRow[] =>
    list.map((id) => ({ key: id, content: <ItemRef id={id} onClick={go} withText /> }));

  return (
    <ReportLayer
      layerId="level-2"
      level="Level 2"
      title="Links"
      question="Does every link in the chain exist, in both directions?"
      method="Code"
    >
      <div className="report-layer-wide">
        <h5 className="report-group-title">Where each fact ended up</h5>
        <FactGraph result={result} caseDefinition={caseDefinition} parsed={snapshot.parsed} nav={nav} />
      </div>

      <LayerCols>
        <LayerCell title="2.1 Client → Requirements">
          <Direction>Forward: lost along the way</Direction>
          <TraceList
            title="Dropped facts"
            explain="The client told you these, but no requirement cites them."
            caseId={caseId}
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
          <Direction>Backward: no origin</Direction>
          <TraceList
            title="Hidden assumptions"
            explain="Requirements stated as fact with no citation and not listed under Assumptions."
            caseId={caseId}
            rows={ids(links.hiddenAssumptions, nav.item)}
          />
          <TraceList
            title="Unverified citations"
            explain="Requirements whose quotes aren't in the chat or the brief."
            caseId={caseId}
            rows={ids(links.uncited, nav.item)}
          />
        </LayerCell>

        <LayerCell title="2.2 Requirements → Decisions">
          <Direction>Forward: lost along the way</Direction>
          <TraceList
            title="Unused requirements"
            explain="No decision says it is because of these."
            caseId={caseId}
            rows={ids(links.unused, nav.item)}
          />
          <Direction>Backward: no origin</Direction>
          <TraceList
            title="Unsupported decisions"
            explain="These cite no requirement that exists."
            caseId={caseId}
            rows={ids(links.unsupported, nav.item)}
          />
        </LayerCell>

        <LayerCell title="2.3 Decisions → Diagram">
          <Direction>Forward: lost along the way</Direction>
          <TraceList
            title="Not drawn"
            explain="Decisions with no sketch, or whose sketch isn't in the final diagram."
            caseId={caseId}
            rows={ids(links.notDrawn, nav.sketch)}
          />
          <Direction>Backward: no origin</Direction>
          <TraceList
            title="Unexplained boxes"
            explain="Boxes in the final diagram that no decision's sketch contains."
            caseId={caseId}
            rows={links.unjustified.map((nodeId) => ({
              key: nodeId,
              content: <BoxRef node={nodeId} onClick={() => nav.node(nodeId)} withText />,
            }))}
          />
          <TraceList
            title="Unexplained connections"
            explain="Connections in the final diagram that no sketch shows."
            caseId={caseId}
            rows={links.unexplainedEdges.map((edge) => ({
              key: `${edge.from}->${edge.to}`,
              content: <BoxRef edge={edge} onClick={() => nav.edge(edge.from, edge.to)} withText />,
            }))}
          />
        </LayerCell>
      </LayerCols>
    </ReportLayer>
  );
}
