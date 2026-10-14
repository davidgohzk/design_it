export type ChatRole = "system" | "user" | "assistant";

/** What the server's cue guard did with one client reply (structured chat, WP2). */
export type ChatGuard = {
  action: "ok" | "regenerated" | "guard_block";
  /** Facts the reply stated without declaring them. */
  leaks: string[];
  /** Facts the reply declared without stating them; removed from disclosedFactIds. */
  phantoms: string[];
};

export type ChatMessage = {
  role: ChatRole;
  content: string;
  /** ms since epoch: when the engineer sent it, or when the client's reply finished. Seeded examples have none. */
  ts?: number;
  /** Client replies only: the case facts this reply states, as checked by the server. */
  disclosedFactIds?: string[];
  guard?: ChatGuard;
};

/** How and why the interview stopped. */
export type InterviewEnd = { at: number; how: "button" | "time_cap"; reason: string };

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
