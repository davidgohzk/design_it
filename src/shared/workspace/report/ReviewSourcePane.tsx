import { useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { CaseDefinition } from "../../../cases";
import type { EdgeRef } from "../../../assessment/types";
import { BriefChatPanel } from "../panels/BriefChatPanel";
import { DocPreview } from "../panels/DocPreview";
import type { DocPreviewHandle } from "../panels/DocPreview";
import { flashChatMessage, flashTextIn } from "../panels/highlight";
import type { ReportSnapshot } from "./reportTypes";
import { useSketchColorState } from "./sketchColors";

/** Where the review's references land: the submitted chat, brief and design doc. */
export type ReviewSourceHandle = {
  showChat: (index: number, quote?: string) => void;
  showBrief: (quote: string) => void;
  showItem: (id: string) => void;
  showSketch: (decisionId: string) => void;
  showDiagram: (target: { nodes?: string[]; edges?: EdgeRef[] }) => void;
};

type Tab = "doc" | "chat";

/** Runs after the tab switch has been painted, so the target is visible when it is scrolled to. */
const afterPaint = (action: () => void) => requestAnimationFrame(() => requestAnimationFrame(action));

/**
 * The review's left column: the work exactly as it was reviewed, the design doc and the chat, one
 * tab at a time. Both stay mounted so a reference can jump straight to its target.
 */
export function ReviewSourcePane({
  snapshot,
  caseDefinition,
  ref,
}: {
  snapshot: ReportSnapshot;
  caseDefinition: CaseDefinition;
  ref?: Ref<ReviewSourceHandle>;
}) {
  const [tab, setTab] = useState<Tab>("doc");
  const [briefOpen, setBriefOpen] = useState(false);
  const docRef = useRef<DocPreviewHandle | null>(null);
  const chatRootRef = useRef<HTMLDivElement | null>(null);
  const briefRef = useRef<HTMLDivElement | null>(null);

  const handle = useMemo<ReviewSourceHandle>(
    () => ({
      showChat: (index, quote) => {
        setTab("chat");
        afterPaint(() => chatRootRef.current && flashChatMessage(index, quote, chatRootRef.current));
      },
      showBrief: (quote) => {
        setTab("chat");
        setBriefOpen(true);
        afterPaint(() => flashTextIn(briefRef.current, quote));
      },
      showItem: (id) => {
        setTab("doc");
        afterPaint(() => docRef.current?.showItem(id));
      },
      showSketch: (decisionId) => {
        setTab("doc");
        afterPaint(() => docRef.current?.showSketch(decisionId));
      },
      showDiagram: (target) => {
        setTab("doc");
        afterPaint(() => docRef.current?.showDiagram(target));
      },
    }),
    [],
  );
  useImperativeHandle(ref, () => handle, [handle]);

  // Citations inside the doc lead to the chat or brief in this pane, never the workspace behind it.
  const citation = useMemo(() => ({ onChat: handle.showChat, onBrief: handle.showBrief }), [handle]);
  // Decision colours on the doc's sketches and final diagram, switched on and off in the doc.
  const colors = useSketchColorState(snapshot.parsed.decisions);

  return (
    <aside className="review-source" aria-label="Your submitted work">
      <header className="panel-header review-source-header">
        <span className="review-source-title">Your work, as reviewed</span>
        <ToggleButtonGroup
          size="small"
          exclusive
          color="primary"
          value={tab}
          onChange={(_event, value: Tab | null) => {
            if (value) setTab(value);
          }}
        >
          <ToggleButton value="doc">Design doc</ToggleButton>
          <ToggleButton value="chat">Chat</ToggleButton>
        </ToggleButtonGroup>
      </header>
      <div className="review-source-body" hidden={tab !== "doc"}>
        <DocPreview
          ref={docRef}
          parsed={snapshot.parsed}
          finalCode={snapshot.finalCode}
          citation={citation}
          colors={colors}
        />
      </div>
      <div className="review-source-body" hidden={tab !== "chat"} ref={chatRootRef}>
        <BriefChatPanel
          briefMarkdown={caseDefinition.briefMarkdown}
          clientName={caseDefinition.clientName}
          messages={snapshot.messages}
          isSending={false}
          readOnly
          briefOpen={briefOpen}
          onBriefOpenChange={setBriefOpen}
          briefRef={(node) => {
            briefRef.current = node;
          }}
        />
      </div>
    </aside>
  );
}
