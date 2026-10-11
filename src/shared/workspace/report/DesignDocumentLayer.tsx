import type { CaseDefinition } from "../../../cases";
import type { AssessmentResult } from "../../../assessment/types";
import { DocReasoningSection } from "./DocReasoningSection";
import { DocStructureSection } from "./DocStructureSection";
import { ReportLayer } from "./ReportLayer";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

/**
 * The design doc: first its structure (code-checked: every piece complete, every link there), then
 * its reasoning (AI-judged: does each requirement, decision and sketch make sense).
 */
export function DesignDocumentLayer(props: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  snapshot: ReportSnapshot;
  nav: ReportNav;
}) {
  return (
    <ReportLayer
      layerId="design-doc"
      title="Design Document"
      question="Is every piece there and linked up, and does the reasoning behind each one make sense?"
    >
      <DocStructureSection {...props} />
      <DocReasoningSection {...props} />
    </ReportLayer>
  );
}
