import { useMemo } from "react";
import type { ReactNode } from "react";
import { decisionPieces, diagramPieces, FINAL_DIAGRAM_ID, requirementPieces } from "../../../assessment/pieces";
import type { PieceList } from "../../../assessment/pieces";
import { useMermaidErrors } from "../../../designDoc/validate";
import { BoxRef, CheckRow, ItemRef, LayerCell, LayerCols } from "./ReportLayer";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

/**
 * One kind of piece: only the items with problems, each with its problems under it, then a line for
 * the rest. `noun` is plural ("requirements").
 */
function PieceListCell({
  title,
  subtitle,
  list,
  noun,
  renderItem,
  nav,
}: {
  title: string;
  subtitle: string;
  list: PieceList;
  noun: string;
  renderItem: (id: string) => ReactNode;
  nav: ReportNav;
}) {
  const clean = list.total - list.flagged.length;
  return (
    <LayerCell title={title} subtitle={subtitle} method="Code · template">
      {list.general.map((message) => (
        <CheckRow key={message} label={message} state="fail" />
      ))}
      {list.flagged.map(({ id, issues }) => (
        <div key={id} className="report-row">
          <div className="report-row-main">
            {renderItem(id)}
            <ul className="report-issues">
              {issues.map((issue) => (
                <li key={`${issue.nodeId ?? ""}:${issue.message}`}>
                  {issue.nodeId && (
                    <>
                      <BoxRef node={issue.nodeId} onClick={() => nav.node(issue.nodeId!)} withText />{" "}
                    </>
                  )}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
      {list.total === 0 ? (
        <div className="report-note">No {noun} yet.</div>
      ) : (
        clean > 0 && (
          <div className="report-list-empty">
            ✓ {list.flagged.length === 0 ? `All ${list.total} ${noun}` : `${clean} other ${noun}`}: no issues.
          </div>
        )
      )}
    </LayerCell>
  );
}

/** Level 1A: is each piece complete against the template? Code only; no AI. */
export function PiecesSection({ snapshot, nav }: { snapshot: ReportSnapshot; nav: ReportNav }) {
  const finalBlock = useMemo(() => ({ final: snapshot.finalCode }), [snapshot.finalCode]);
  const mermaidErrors = useMermaidErrors(finalBlock);
  const { parsed } = snapshot;
  const requirements = requirementPieces(parsed);
  const decisions = decisionPieces(parsed, snapshot.docMarkdown);
  const diagrams = diagramPieces(parsed, mermaidErrors.final);

  return (
    <LayerCols>
        <PieceListCell
          title="Requirements"
          subtitle="Each has words, a reference to the chat or the brief, and its own id."
          list={requirements}
          noun="requirements"
          renderItem={(id) => <ItemRef id={id} onClick={nav.item} withText />}
          nav={nav}
        />
        <PieceListCell
          title="Design"
          subtitle='Each decision has a choice, a "because" citing requirements that exist, and a trade-off.'
          list={decisions}
          noun="decisions"
          renderItem={(id) => <ItemRef id={id} onClick={nav.item} withText />}
          nav={nav}
        />
        <PieceListCell
          title="Diagrams"
          subtitle="Each sketch parses; the final diagram renders and every box comes from a decision's sketch."
          list={diagrams}
          noun="diagrams"
          renderItem={(id) =>
            id === FINAL_DIAGRAM_ID ? (
              <span className="report-row-title">Final diagram</span>
            ) : (
              <span className="report-ref-line">
                <ItemRef id={id} onClick={nav.sketch} />
                <span className="report-ref-text">sketch</span>
              </span>
            )
          }
          nav={nav}
        />
    </LayerCols>
  );
}
