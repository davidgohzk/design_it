import { useRef } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import ReactMarkdown from "react-markdown";
import { ChatBubble } from "../ChatBubble";
import { flashTextIn } from "../simple/highlight";
import type { ChatMessage } from "../../types";
import { flashTextMatch } from "../../utils";

export type ReportSource = { kind: "chat"; index: number; quote?: string } | { kind: "brief"; quote: string };

const FLASH_MS = 2500;

/**
 * The review covers the whole page, so a Chat #N or Brief chip in it opens the source here:
 * the transcript scrolled to that message, or the brief, with the quoted words highlighted.
 */
export function SourceDialog({
  source,
  onClose,
  messages,
  briefMarkdown,
  clientName,
}: {
  source: ReportSource | null;
  onClose: () => void;
  messages: ChatMessage[];
  briefMarkdown: string;
  clientName: string;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  const highlight = () => {
    const container = contentRef.current;
    if (!container || !source) return;
    if (source.kind === "brief") {
      flashTextIn(container, source.quote);
      return;
    }
    const bubble = container.querySelector<HTMLElement>(`[data-message="${source.index}"]`);
    if (!bubble) return;
    bubble.scrollIntoView({ block: "center" });
    const cleanup = source.quote ? flashTextMatch(bubble, source.quote, "chat-text-highlight") : null;
    if (!cleanup) bubble.classList.add("quote-highlight");
    setTimeout(() => {
      cleanup?.();
      bubble.classList.remove("quote-highlight");
    }, FLASH_MS);
  };

  return (
    <Dialog
      open={source !== null}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ transition: { onEntered: highlight } }}
    >
      <DialogTitle>
        {source?.kind === "brief" ? "The brief" : `Chat with ${clientName} (message #${source?.index ?? ""})`}
      </DialogTitle>
      <DialogContent ref={contentRef} dividers>
        {source?.kind === "brief" ? (
          <div className="markdown-body">
            <ReactMarkdown>{briefMarkdown}</ReactMarkdown>
          </div>
        ) : (
          <div className="chat-log">
            {messages.map((message, index) => (
              <div key={index} data-message={index}>
                <ChatBubble role={message.role} content={message.content} showLoading={false} />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
