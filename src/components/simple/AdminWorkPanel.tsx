import { useState } from "react";
import { Divider, Tab, Tabs } from "@mui/material";
import type { ParsedDesignDoc } from "../../designDoc/parse";
import { DocEditorPanel } from "./DocEditorPanel";
import { DiagramHistoryPanel } from "./DiagramChatPanel";
import type { CitationHandlers } from "./citationLinks";
import type { DiagramTurn } from "./useDesignWorkspace";

/** Admin view: the engineer's doc (read-only) and every diagram-helper prompt with its result. */
export function AdminWorkPanel({
  docMarkdown,
  parsed,
  finalCode,
  diagramTurns,
  finalIssues,
  unjustifiedNodes,
  citation,
}: {
  docMarkdown: string;
  parsed: ParsedDesignDoc;
  finalCode: string;
  diagramTurns: DiagramTurn[];
  finalIssues: string[];
  unjustifiedNodes: string[];
  citation: CitationHandlers;
}) {
  const [tab, setTab] = useState(0);
  return (
    <div className="simple-final">
      <Tabs value={tab} onChange={(_event, value) => setTab(value as number)} sx={{ px: 1 }}>
        <Tab label="Design doc" />
        <Tab label="Description" />
      </Tabs>
      <Divider />
      {tab === 0 ? (
        <DocEditorPanel
          markdown={docMarkdown}
          parsed={parsed}
          onChange={() => {}}
          citation={citation}
          readOnly
          title="Design doc (read-only)"
          finalCode={finalCode}
          finalIssues={finalIssues}
          unjustifiedNodes={unjustifiedNodes}
        />
      ) : (
        <DiagramHistoryPanel turns={diagramTurns} />
      )}
    </div>
  );
}
