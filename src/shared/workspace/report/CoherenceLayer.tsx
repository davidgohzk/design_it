import type { CaseDefinition } from "../../../cases";
import type { AssessmentResult } from "../../../assessment/types";
import { LinksSection } from "./LinksSection";
import { PiecesSection } from "./PiecesSection";
import { RequirementFlow } from "./RequirementFlow";
import { ReportLayer, ReportSection } from "./ReportLayer";
import type { ReportNav, ReportSnapshot } from "./reportTypes";

/**
 * Level 1: is the work coherent on its own terms? The flow of references shows every link at once; 1A
 * checks each piece against the template; 1B lists every link that is missing. Code only: the same
 * work always gets the same answer.
 */
export function CoherenceLayer({
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
  return (
    <ReportLayer
      layerId="level-1"
      level="Level 1"
      title="Inner coherence"
      question="Is each piece complete, and does every link between them exist?"
      method="Code"
    >
      <div className="report-web">
        <h4 className="report-web-title">Flow of references</h4>
        <div className="report-cell-subtitle">
          Every source, requirement, decision, design (each decision's sketch) and component, joined by the
          references between them.
        </div>
        <RequirementFlow parsed={snapshot.parsed} links={result.links} nav={nav} />
      </div>
      <ReportSection
        sectionId="level-1-pieces"
        badge="1A"
        title="Individual components"
        question="Is each piece complete against the template? Only the items with problems are listed."
        method="Code · template"
      >
        <PiecesSection snapshot={snapshot} nav={nav} />
      </ReportSection>
      <ReportSection
        sectionId="level-1-links"
        badge="1B"
        title="Links"
        question="Does every link in the chain exist, forward (carried on) and backward (has an origin)?"
        method="Code"
      >
        <LinksSection result={result} caseDefinition={caseDefinition} nav={nav} />
      </ReportSection>
    </ReportLayer>
  );
}
