import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { Box, Button, Collapse, Divider, TextField, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import { ChatBubble } from "../../components/ChatBubble";
import type { ChatMessage, FloatingQuote } from "../../lib/types";
import { getQuotePosition } from "../../lib/utils";

type QuoteTarget = FloatingQuote & { source: "brief" | "chat"; index?: number };

export type BriefChatPanelProps = {
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
              content={message.content}
              showLoading={isSending && index === messages.length - 1}
              index={index}
              onQuote={readOnly || message.role !== "assistant" ? undefined : handleWholeMessageQuote}
              onSelectionQuote={readOnly || message.role !== "assistant" ? undefined : handleChatSelection}
              onDismissSelectionQuote={() => setQuote(null)}
            />
          ))}
        </div>
        {!readOnly && (
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
                {isSending ? "Streaming..." : "Send"}
              </Button>
              <Typography variant="caption" color="text.secondary">
                Select text in a reply or the brief to cite it
              </Typography>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
