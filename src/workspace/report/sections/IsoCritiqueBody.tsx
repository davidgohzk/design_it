import type { ReactNode } from "react";
import type { CritiquePoint, IsoCharacteristic } from "@/review/judge/summaryReview";
import { QUALITY_LABEL } from "@/designDoc/parse";
import { FeedbackButtons } from "@/workspace/report/FeedbackButtons";
import { CellEmpty, LayerCell, LayerCols, ReportSection } from "@/workspace/report/ReportLayer";

const COLUMNS = [
  { kind: "strengths", title: "What's good", empty: "Nothing stood out." },
  { kind: "weaknesses", title: "What's not so good", empty: "Nothing stood out." },
  { kind: "improvements", title: "What to improve", empty: "No suggestions." },
] as const;

/**
 * The critique of the whole design against the product quality characteristics of ISO/IEC 25010:2023:
 * one foldable part per characteristic, each read as what is good, what is not, and what to do next.
 * A characteristic the design never touches is listed in one line instead of a part of its own.
 */
export function IsoCritiqueBody({
  critique,
  caseId,
  renderRef,
}: {
  critique: IsoCharacteristic[];
  caseId: string;
  renderRef: (id: string) => ReactNode;
}) {
  const judged = critique.filter((item) => item.verdict !== "not_addressed");
  const untouched = critique.filter((item) => item.verdict === "not_addressed");

  const point = (characteristic: string, kind: string, item: CritiquePoint, index: number) => (
    <div key={index} className="report-row">
      <div className="report-row-main">
        <span className="report-row-title">{item.point}</span>
        {!item.quote && <div className="report-row-detail">No quote from your work backs this up; read it as a hint.</div>}
        {item.quote && <div className="report-quote">“{item.quote}”</div>}
        {item.refs.length > 0 && <div className="report-box-refs">{item.refs.map(renderRef)}</div>}
      </div>
      <FeedbackButtons caseId={caseId} item={`iso:${characteristic}:${kind}:${index}`} />
    </div>
  );

  return (
    <>
      {judged.length === 0 && untouched.length === critique.length && (
        <CellEmpty>
          This review has no ISO 25010 critique yet: the design addressed none of the characteristics, or the critique did not run. Run
          the review again to get one.
        </CellEmpty>
      )}

      {judged.map((characteristic) => (
        <ReportSection
          key={characteristic.id}
          sectionId={`iso-${characteristic.id}`}
          title={QUALITY_LABEL[characteristic.id]}
          method="ai_verified_quote"
          summary={<span className={`report-rating report-rating-${characteristic.verdict}`}>{characteristic.verdict}</span>}
        >
          <p className="report-critique-summary">{characteristic.summary}</p>
          <LayerCols>
            {COLUMNS.map(({ kind, title, empty }) => (
              <LayerCell key={kind} title={title}>
                {characteristic[kind].length === 0 && <CellEmpty>{empty}</CellEmpty>}
                {characteristic[kind].map((item, index) => point(characteristic.id, kind, item, index))}
              </LayerCell>
            ))}
          </LayerCols>
        </ReportSection>
      ))}

      {untouched.length > 0 && judged.length > 0 && (
        <div className="report-note">
          Not addressed by this design: {untouched.map((item) => QUALITY_LABEL[item.id]).join(", ")}.
        </div>
      )}
    </>
  );
}
