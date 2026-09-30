export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type TimelineEntryType = "chat" | "editor" | "design" | "quote";

export type TimelineEntry = {
  id: string;
  at: number;
  type: TimelineEntryType;
  summary: string;
  detail: string;
  /** Quotes only: where the quote was inserted. */
  target?: string;
  /** Editor entries only: a unified diff patch. */
  diff?: string;
};

export type ReviewReference = {
  id: string;
  target: string;
  label: string;
  excerpt: string;
  source: "brief" | "chat";
  messageIndex?: number;
  valid: boolean;
  invalidReason?: string;
};

export type FloatingQuote = {
  text: string;
  top: number;
  left: number;
};
