import { memo, useCallback } from "react";
import type { MouseEvent } from "react";
import { IconButton, Paper, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import type { ChatRole } from "../types";
import { roleLabel } from "../utils";

type ChatBubbleProps = {
  role: ChatRole;
  content: string;
  showLoading: boolean;
  index?: number;
  onQuote?: (text: string, index: number) => void;
  onSelectionQuote?: (text: string, index: number, rect: DOMRect) => void;
  onDismissSelectionQuote?: () => void;
};

export const ChatBubble = memo(function ChatBubble({
  role,
  content,
  showLoading,
  index,
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
    <Paper
      id={index !== undefined ? `chat-msg-${index}` : undefined}
      className={`bubble ${role}`}
      variant="outlined"
      onMouseUp={handleMouseUp}
    >
      <div className="bubble-header">
        <Typography variant="caption" className="bubble-title">
          {roleLabel(role)}
        </Typography>
        {role !== "system" && onQuote !== undefined && index !== undefined && (
          <div className="bubble-actions">
            <IconButton
              size="small"
              title="Quote this message in editor"
              onClick={() => onQuote(content, index)}
              sx={{ padding: "2px", fontSize: "0.8rem", lineHeight: 1 }}
            >
              "
            </IconButton>
          </div>
        )}
      </div>
      <div>
        <ReactMarkdown>{content || (showLoading ? "..." : "")}</ReactMarkdown>
      </div>
    </Paper>
  );
});
