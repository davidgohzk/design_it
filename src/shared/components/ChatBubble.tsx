import { memo, useCallback } from "react";
import type { MouseEvent } from "react";
import { IconButton, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import type { ChatRole } from "../lib/types";

type ChatBubbleProps = {
  role: ChatRole;
  /** Who said it: "You" or the client's name. */
  name: string;
  content: string;
  showLoading: boolean;
  index?: number;
  /** When it was sent (ms since epoch); shown on hover. */
  ts?: number;
  onQuote?: (text: string, index: number) => void;
  onSelectionQuote?: (text: string, index: number, rect: DOMRect) => void;
  onDismissSelectionQuote?: () => void;
};

const timeLabel = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** One message, shown like a Slack thread: avatar, name, time on hover, and its #N number. */
export const ChatBubble = memo(function ChatBubble({
  role,
  name,
  content,
  showLoading,
  index,
  ts,
  onQuote,
  onSelectionQuote,
  onDismissSelectionQuote,
}: ChatBubbleProps) {
  const handleMouseUp = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!onSelectionQuote || index === undefined || role === "system") return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        onDismissSelectionQuote?.();
        return;
      }

      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      if (!anchorNode || !focusNode) {
        onDismissSelectionQuote?.();
        return;
      }

      const container = event.currentTarget;
      if (!container.contains(anchorNode) || !container.contains(focusNode)) {
        onDismissSelectionQuote?.();
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      onSelectionQuote(selection.toString().trim(), index, rect);
    },
    [index, onDismissSelectionQuote, onSelectionQuote, role],
  );

  return (
    <div
      id={index !== undefined ? `chat-msg-${index}` : undefined}
      className={`bubble slack-message ${role}`}
      onMouseUp={handleMouseUp}
    >
      <div className={`slack-avatar ${role}`} aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="slack-body">
        <div className="bubble-header">
          <Typography variant="body2" component="span" className="bubble-title">
            {name}
          </Typography>
          {ts !== undefined && (
            <Typography variant="caption" component="time" className="slack-time" dateTime={new Date(ts).toISOString()}>
              {timeLabel(ts)}
            </Typography>
          )}
          {index !== undefined && (
            <Typography variant="caption" component="span" className="slack-permalink" title={`Message #${index}`}>
              #{index}
            </Typography>
          )}
          {role !== "system" && onQuote !== undefined && index !== undefined && (
            <div className="bubble-actions">
              <IconButton
                size="small"
                title="Cite this message in the doc"
                aria-label={`Cite message #${index}`}
                onClick={() => onQuote(content, index)}
                sx={{ padding: "2px 6px", fontSize: "0.75rem", borderRadius: 1 }}
              >
                Cite
              </IconButton>
            </div>
          )}
        </div>
        <div className="slack-text">
          <ReactMarkdown>{content || (showLoading ? "..." : "")}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
});
