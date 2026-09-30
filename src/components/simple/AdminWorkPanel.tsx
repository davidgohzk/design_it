import { useMemo, useState } from "react";
import { Divider, Tab, Tabs } from "@mui/material";
import type { ConsistencyIssue } from "../../designDoc/consistency";
import { parseMermaidFlowchart } from "../../designDoc/parse";
import type { ParsedDesignDoc } from "../../designDoc/parse";
import { DocEditorPanel } from "./DocEditorPanel";
import { FinalDiagramPanel } from "./FinalDiagramPanel";
import { FinalHistoryStepper } from "./FinalHistoryStepper";
import type { CitationHandlers } from "./citationLinks";
import type { FinalTurn } from "./useDesignWorkspace";

/** Admin view: the engineer's doc (read-only) and the final diagram with its full history. */
export function AdminWorkPanel({
  docMarkdown,
  parsed,
  finalCode,
  finalHistory,
  issues,
  unjustifiedNodes,
  citation,
}: {
  docMarkdown: string;
  parsed: ParsedDesignDoc;
  finalCode: string;
  finalHistory: FinalTurn[];
  issues: ConsistencyIssue[];
  unjustifiedNodes: string[];
  citation: CitationHandlers;
}) {
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState<number | null>(null);
  // Follow the latest turn until the admin steps back through the history.
  const index = step ?? Math.max(0, finalHistory.length - 1);
  const shownCode = finalHistory.length && step !== null ? finalHistory[index].code : finalCode;
  const shownGraph = useMemo(() => parseMermaidFlowchart(shownCode), [shownCode]);
  const isLatest = shownCode === finalCode;

  return (
    <div className="simple-final">
      <Tabs value={tab} onChange={(_event, value) => setTab(value as number)} sx={{ px: 1 }}>
        <Tab label="Design doc" />
        <Tab label="Final diagram" />
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
          unjustifiedNodes={unjustifiedNodes}
        />
      ) : (
        <FinalDiagramPanel
          readOnly
          code={shownCode}
          final={shownGraph}
          nodeDecisions={parsed.nodeDecisions}
          issues={isLatest ? issues : []}
          unjustifiedNodes={isLatest ? unjustifiedNodes : []}
          historyControls={
            <FinalHistoryStepper
              history={finalHistory}
              index={index}
              onChange={(next) => setStep(next)}
            />
          }
        />
      )}
    </div>
  );
}
