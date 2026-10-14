import type { ParsedDesignDoc } from "../../../designDoc/parse";
import type { ChatMessage } from "../../lib/types";

/** The work as it was when it was submitted; the report never reads the live doc. */
export type ReportSnapshot = {
  messages: ChatMessage[];
  docMarkdown: string;
  finalCode: string;
  parsed: ParsedDesignDoc;
};

export type AssessmentStatus = "idle" | "loading" | "success" | "error";
