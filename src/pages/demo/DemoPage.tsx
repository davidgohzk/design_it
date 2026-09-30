import { BRIGHTPATH_CASE } from "../../cases/brightpath";
import { BRIGHTPATH_COMPLETE_SEED, BRIGHTPATH_SEED } from "../../cases/brightpath.seed";
import { CaseWorkspace } from "../../shared/workspace/CaseWorkspace";
import { exampleConfig } from "../../shared/workspace/config";
import type { WorkspaceConfig } from "../../shared/workspace/config";

const CONFIG: WorkspaceConfig = {
  caseDefinition: BRIGHTPATH_CASE,
  examples: exampleConfig({ sample: BRIGHTPATH_SEED, complete: BRIGHTPATH_COMPLETE_SEED }),
};

/** /demo: the BrightPath child alert case (Sarah). */
export default function DemoPage() {
  return <CaseWorkspace config={CONFIG} />;
}
