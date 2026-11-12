import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import {
  Box,
  Button,
  Collapse,
  Divider,
  Portal,
  TextField,
  Typography,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import { ChatBubble } from "@/ui/ChatBubble";
import type { ChatMessage, FloatingQuote, InterviewEnd } from "@/lib/types";
import { getQuotePosition } from "@/lib/utils";

type QuoteTarget = FloatingQuote & { source: "brief" | "chat"; index?: number };

type BriefChatPanelProps = {
  briefMarkdown: string;
  clientName: string;
  messages: ChatMessage[];
  isSending: boolean;
  readOnly?: boolean;
  briefOpen: boolean;
  onBriefOpenChange: (open: boolean) => void;
  briefRef: (node: HTMLDivElement | null) => void;
  onSend?: (text: string) => void;
  /** Quote a brief excerpt (index undefined) or a chat excerpt into the design doc. */
  onQuote?: (text: string, index?: number) => void;
  /** Set once the interview has stopped; the chat input is replaced by a note. */
  interviewEnd?: InterviewEnd | null;
};

export function BriefChatPanel({
  briefMarkdown,
  clientName,
  messages,
  isSending,
  readOnly = false,
  briefOpen,
  onBriefOpenChange,
  briefRef,
  onSend,
  onQuote,
  interviewEnd,
}: BriefChatPanelProps) {
  const [input, setInput] = useState("");
  const [quote, setQuote] = useState<QuoteTarget | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending || !onSend) return;
    onSend(text);
    setInput("");
  };

  const handleBriefMouseUp = useCallback(() => {
    if (readOnly) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!selection || selection.isCollapsed || !text) {
      setQuote(null);
      return;
    }
    setQuote({ text, source: "brief", ...getQuotePosition(selection.getRangeAt(0).getBoundingClientRect()) });
  }, [readOnly]);

  const handleChatSelection = useCallback((text: string, index: number, rect: DOMRect) => {
    setQuote({ text, index, source: "chat", ...getQuotePosition(rect) });
  }, []);

  const handleWholeMessageQuote = useCallback(
    (text: string, index: number) => onQuote?.(text, index),
    [onQuote],
  );

  return (
    <div className="simple-left">
      {quote && onQuote && (
        // The panel's backdrop-filter makes it the containing block for fixed children, offsetting and clipping them.
        <Portal>
          <Box
            sx={{ position: "fixed", top: quote.top, left: quote.left, transform: "translateX(-50%)", zIndex: 9999 }}
          >
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                onQuote(quote.text, quote.source === "chat" ? quote.index : undefined);
                setQuote(null);
                window.getSelection()?.removeAllRanges();
              }}
            >
              ❝ Quote
            </Button>
          </Box>
        </Portal>
      )}
      <header className="panel-header">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Brief &amp; chat with {clientName}
        </Typography>
        <Button size="small" onClick={() => onBriefOpenChange(!briefOpen)}>
          {briefOpen ? "Hide brief" : "Show brief"}
        </Button>
      </header>
      <Divider />
      <Collapse in={briefOpen} unmountOnExit={false}>
        <div ref={briefRef} className="simple-brief markdown-body scrollable" onMouseUp={handleBriefMouseUp}>
          <ReactMarkdown>{briefMarkdown}</ReactMarkdown>
        </div>
        <Divider />
      </Collapse>
      <div className="chat-panel-main">
        <div className="chat-log scrollable simple-chat-log" aria-live="polite">
          {messages.map((message, index) => (
            <ChatBubble
              key={`${message.role}-${index}`}
              role={message.role}
              name={message.role === "user" ? "You" : clientName}
              ts={message.ts}
              content={message.content}
              showLoading={isSending && index === messages.length - 1}
              index={index}
              onQuote={readOnly || message.role !== "assistant" ? undefined : handleWholeMessageQuote}
              onSelectionQuote={readOnly || message.role !== "assistant" ? undefined : handleChatSelection}
              onDismissSelectionQuote={() => setQuote(null)}
            />
          ))}
        </div>
        {interviewEnd && (
          <div className="interview-ended" role="status">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ⊘ Interview ended {interviewEnd.how === "time_cap" ? "(time is up)" : ""}
            </Typography>
            {interviewEnd.reason && (
              <Typography variant="caption" color="text.secondary">
                Why: {interviewEnd.reason}
              </Typography>
            )}
          </div>
        )}
        {!readOnly && !interviewEnd && (
          <form className="chat-input" onSubmit={submit}>
            <TextField
              multiline
              minRows={2}
              maxRows={5}
              placeholder={`Ask ${clientName} something...`}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) submit(event);
              }}
            />
            <div className="chat-actions">
              <Button type="submit" variant="contained" disabled={isSending || !input.trim() || !onSend}>
                {isSending ? "Replying..." : "Send"}
              </Button>
              <Typography variant="caption" color="text.secondary">
                Enter sends · Shift+Enter for a new line
              </Typography>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
