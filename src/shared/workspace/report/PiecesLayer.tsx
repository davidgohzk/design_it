import { useMemo } from "react";
import type { CaseDefinition } from "../../../cases";
import { designDocChecks, diagramChecks } from "../../../assessment/pieces";
import { summarize } from "../../../assessment/summary";
import type { AssessmentResult } from "../../../assessment/types";
import { useMermaidErrors } from "../../../designDoc/validate";
import { FoundSection } from "./FoundSection";
import { BoxRef, CheckRow, ItemRef, LayerCell, LayerCols, PieceCheckRow, ReportLayer } from "./ReportLayer";
import { Stat } from "./SummaryStrip";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

const ratio = ({ found, total }: { found: number; total: number }) => `${found} / ${total}`;

/** Level 1: is each piece good on its own? */
export function PiecesLayer({
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
  const summary = summarize(result, caseDefinition.facts);
  const finalBlock = useMemo(() => ({ final: snapshot.finalCode }), [snapshot.finalCode]);
  const mermaidErrors = useMermaidErrors(finalBlock);
  const docChecks = designDocChecks(snapshot.parsed, snapshot.docMarkdown);
  const boxChecks = diagramChecks(snapshot.parsed, mermaidErrors.final);

  return (
    <ReportLayer layerId="level-1" level="Level 1" title="Pieces" question="Is each piece good on its own?">
      <LayerCols>
        <LayerCell
          title="1A Interview"
          subtitle="Hidden facts you surfaced in the chat, against the case's fact list."
          method="AI · verified quotes"
        >
          <div className="report-mini-stats">
            <Stat value={ratio(summary.factsFound)} label="facts found" />
            <Stat value={ratio(summary.onAskFound)} label="on-ask" />
            {summary.onProbeFound.total > 0 && <Stat value={ratio(summary.onProbeFound)} label="on-probe" />}
          </div>
          <CheckRow label="Wrong suggestion challenged" state="na" detail="Not measured yet." />
          <FoundSection result={result} caseDefinition={caseDefinition} parsed={snapshot.parsed} nav={nav} />
        </LayerCell>

        <LayerCell title="1B Design doc" subtitle="Against the template." method="Code · template">
          {docChecks.map((check) => (
            <PieceCheckRow key={check.label} check={check} renderRef={(id) => <ItemRef id={id} onClick={nav.item} withText />} />
          ))}
        </LayerCell>

        <LayerCell title="1C Diagram" subtitle="Against the template." method="Code · template">
          {boxChecks.map((check) => (
            <PieceCheckRow
              key={check.label}
              check={check}
              renderRef={(id) => <BoxRef node={id} onClick={() => nav.node(id)} withText />}
            />
          ))}
        </LayerCell>
      </LayerCols>
    </ReportLayer>
  );
}
