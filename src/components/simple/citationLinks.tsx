import type { ReactNode } from "react";
import { Tooltip } from "@mui/material";
import { normalizeQuoteText } from "../../utils";

/** A reference takes the colour of what it points to, matching the R#/A#/D# id chips. */
const ITEM_REF_CLASS: Record<string, string> = {
  R: "simple-ref-requirement",
  A: "simple-ref-assumption",
  D: "simple-ref-decision",
};

export type CitationHandlers = {
  onBrief: (quote: string) => void;
  onChat: (index: number, quote?: string) => void;
  onItem?: (id: string) => void;
};

/**
 * ReactMarkdown components that turn citations into clickable chips:
 * [label](#cs "quote"), [label](#chat-msg-N "quote") and [R1](#R1).
 */
export function citationComponents({ onBrief, onChat, onItem }: CitationHandlers) {
  return {
    // Items render inline next to their id chip, so drop the paragraph wrapper.
    p: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    a: ({ href, title, children }: { href?: string; title?: string; children?: ReactNode }) => {
      if (href === "#cs") {
        return (
          <Tooltip title={title ? `"${title}"` : ""} arrow placement="top">
            <span className="inline-ref inline-ref-cs" role="link" tabIndex={0} onClick={() => onBrief(title ?? "")}>
              {children}
            </span>
          </Tooltip>
        );
      }
      const chat = href?.match(/^#chat-msg-(\d+)$/);
      if (chat) {
        return (
          <Tooltip title={title ? `"${title}"` : ""} arrow placement="top">
            <span
              className="inline-ref inline-ref-chat"
              role="link"
              tabIndex={0}
              onClick={() => onChat(Number(chat[1]), title ? normalizeQuoteText(title) : undefined)}
            >
              {children}
            </span>
          </Tooltip>
        );
      }
      const item = href?.match(/^#([RAD]\d+)$/);
      if (item) {
        return (
          <span
            className={`inline-ref ${ITEM_REF_CLASS[item[1][0]]}`}
            role="link"
            tabIndex={0}
            onClick={() => onItem?.(item[1])}
          >
            {children}
          </span>
        );
      }
      return <a href={href}>{children}</a>;
    },
  };
}
