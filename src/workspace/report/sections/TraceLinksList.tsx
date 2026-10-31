import type { ReactNode } from "react";
import type { CaseDefinition } from "@/cases";
import type { AssessmentResult } from "@/review/types";
import { usableSketches } from "@/designDoc/consistency";
import type { ParsedDesignDoc } from "@/designDoc/parse";
import type { CitationHandlers } from "@/workspace/panels/citationLinks";
import { BoxRef, ChatRef, ItemRef, LayerCell, LayerCols } from "@/workspace/report/ReportLayer";

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
          <div className="report-row-detail report-list-explain">{explain}</div>
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

const Direction = ({ children }: { children: string }) => <div className="report-direction">{children}</div>;

/**
 * Links: does every link in the chain exist, forward (carried on) and backward (has an origin)?
 * Code only: a link is a reference, and the same doc always gives the same answer.
 */
export function TraceLinksList({
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
  const { keep } = result;
  const label = (factId: string) => caseDefinition.facts.find((fact) => fact.id === factId)?.label ?? factId;
  const askedAt = new Map(result.ask.facts.map((fact) => [fact.factId, fact]));
  const ids = (list: string[]): ListRow[] =>
    list.map((id) => ({ key: id, content: <ItemRef id={id} onClick={citation.onItem} withText /> }));

  // A fact the client gave that no requirement carries: the first link of the chain, missing.
  const dropped = keep.traces.filter((trace) => trace.requirementIds.length === 0).map((trace) => trace.factId);
  // A requirement no decision is because of, and a decision whose sketch never reaches the diagram.
  const cited = new Set(doc.decisions.flatMap((decision) => decision.because));
  const unused = doc.requirements.filter((requirement) => requirement.text.trim() && !cited.has(requirement.id)).map((item) => item.id);
  const finalIds = new Set(doc.final.nodes.map((node) => node.id));
  const sketched = new Set(usableSketches(doc.decisions).map((decision) => decision.id));
  const notDrawn = doc.decisions
    .filter((decision) => !sketched.has(decision.id) || !(decision.sketch?.nodes ?? []).some((node) => !node.isActor && finalIds.has(node.id)))
    .map((decision) => decision.id);

  return (
    <LayerCols>
      <LayerCell title="A. Source → Requirements">
        <Direction>Forward: lost along the way</Direction>
        <TraceList
          title="Dropped requirements"
          explain="The client told you these, but no requirement of yours carries them."
          rows={dropped.map((factId) => {
            const found = askedAt.get(factId);
            return {
              key: factId,
              content: (
                <>
                  <span className="report-row-title">{label(factId)}</span>{" "}
                  {found?.messageIndex !== undefined && <ChatRef index={found.messageIndex} quote={found.evidence} onChat={citation.onChat} />}
                </>
              ),
            };
          })}
        />
        <Direction>Backward: no origin</Direction>
        <TraceList
          title="Uncited requirements"
          explain="Requirements with no citation, or whose quotes aren't in the chat or the brief."
          rows={ids(keep.uncitedRequirements)}
        />
      </LayerCell>

      <LayerCell title="B. Requirements → Decisions">
        <Direction>Forward: lost along the way</Direction>
        <TraceList title="Unused requirements" explain="No decision says it is because of these." rows={ids(unused)} />
        <Direction>Backward: no origin</Direction>
        <TraceList title="Unsupported decisions" explain="These cite no requirement that exists." rows={ids(keep.unsupportedDecisions)} />
      </LayerCell>

      <LayerCell
        title="C. Decisions → Components"
        subtitle="To see which decision draws which component, switch the decision colours on the design doc on the left."
      >
        <Direction>Forward: lost along the way</Direction>
        <TraceList
          title="Not drawn"
          explain="Decisions with no sketch, or whose sketch isn't among the components."
          rows={notDrawn.map((id) => ({ key: id, content: <ItemRef id={id} onClick={citation.onSketch ?? citation.onItem} withText /> }))}
        />
        <Direction>Backward: no origin</Direction>
        <TraceList
          title="Unexplained components"
          explain="Components that no decision's sketch contains."
          rows={keep.unjustifiedNodes.map((nodeId) => ({
            key: nodeId,
            content: <BoxRef node={nodeId} onClick={() => citation.onNode?.(nodeId)} withText />,
          }))}
        />
        <TraceList
          title="Unexplained connections"
          explain="Connections between components that no sketch shows."
          rows={keep.unexplainedEdges.map((edge) => ({
            key: `${edge.from}->${edge.to}`,
            content: (
              <span className="report-ref-line">
                <BoxRef node={edge.from} onClick={() => citation.onNode?.(edge.from)} />
                <span className="report-ref-text">→</span>
                <BoxRef node={edge.to} onClick={() => citation.onNode?.(edge.to)} />
              </span>
            ),
          }))}
        />
      </LayerCell>
    </LayerCols>
  );
}
