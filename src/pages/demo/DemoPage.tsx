import { COMMUNITY_ROOM_CASE } from "../../cases/community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "../../cases/community-room/seed";
import { CaseWorkspace } from "../../shared/workspace/CaseWorkspace";
import { exampleConfig } from "../../shared/workspace/config";
import type { WorkspaceConfig } from "../../shared/workspace/config";

const CONFIG: WorkspaceConfig = {
  caseDefinition: COMMUNITY_ROOM_CASE,
  examples: exampleConfig({ sample: COMMUNITY_ROOM_SEED, complete: COMMUNITY_ROOM_COMPLETE_SEED }),
};

/** /demo: the community-room booking case (Mei). */
export default function DemoPage() {
  return <CaseWorkspace config={CONFIG} />;
}
