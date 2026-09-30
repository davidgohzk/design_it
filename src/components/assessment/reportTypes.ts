import type { ParsedDesignDoc } from "../../designDoc/parse";
import type { ChatMessage } from "../../types";

/** The work as it was when Review was clicked; the report never reads the live doc. */
export type ReportSnapshot = {
  messages: ChatMessage[];
  docMarkdown: string;
  finalCode: string;
  parsed: ParsedDesignDoc;
};

/** Where report links go: a chat message, an item in the doc copy, a sketch, or a box. */
export type ReportNav = {
  chat: (index: number, quote?: string) => void;
  brief: (quote: string) => void;
  item: (id: string) => void;
  sketch: (decisionId: string) => void;
  node: (nodeId: string) => void;
};
