import type { ChatMessage, ReviewReference } from "./types";

export const normalizeEvidence = (value: string) =>
  value
    .replace(/\\(["\\])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Every [label](#cs "quote") and [label](#chat-msg-N "quote") citation, checked against its source. */
export function extractReviewReferences(
  reportMarkdown: string,
  briefMarkdown: string,
  messages: ChatMessage[],
): ReviewReference[] {
  const references: ReviewReference[] = [];
  const linkPattern =
    /\[([^\]]+)]\((#(?:cs|chat-msg-(\d+)))\s+"((?:\\.|[^"\\])*)"\)/g;

  for (const match of reportMarkdown.matchAll(linkPattern)) {
    const [, label, target, messageIndexText, rawExcerpt] = match;
    const excerpt = rawExcerpt.replace(/\\(["\\])/g, "$1");
    const normalizedExcerpt = normalizeEvidence(excerpt);
    let valid = Boolean(normalizedExcerpt);
    let invalidReason: string | undefined;
    let source: ReviewReference["source"] = "brief";
    let messageIndex: number | undefined;

    if (target === "#cs") {
      if (!normalizedExcerpt || !normalizeEvidence(briefMarkdown).includes(normalizedExcerpt)) {
        valid = false;
        invalidReason = "The quoted excerpt was not found in the case brief.";
      }
    } else {
      source = "chat";
      messageIndex = Number(messageIndexText);
      const message = messages[messageIndex];
      if (!message) {
        valid = false;
        invalidReason = "The referenced chat message does not exist.";
      } else if (message.role !== "assistant") {
        valid = false;
        invalidReason = "The referenced chat message is not a client response.";
      } else if (
        !normalizedExcerpt ||
        !normalizeEvidence(message.content).includes(normalizedExcerpt)
      ) {
        valid = false;
        invalidReason = "The quoted excerpt was not found in the client response.";
      }
    }

    references.push({
      id: `ref-${references.length}`,
      target,
      label,
      excerpt,
      source,
      messageIndex,
      valid,
      invalidReason,
    });
  }

  return references;
}

export function parseReviewJson(content: string): unknown {
  const trimmed = content.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error("The AI returned malformed review JSON. Please retry.");
  }
}
