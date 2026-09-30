import { describe, expect, it } from "vitest";
import { extractReviewReferences, parseReviewJson } from "./evidence";

const briefMarkdown = "The team has 40 field workers.";
const messages = [
  { role: "user" as const, content: "How is connectivity?" },
  { role: "assistant" as const, content: "The phone signal is patchy in the field." },
];

describe("citation references", () => {
  it("validates brief and client references and rejects a missing chat target", () => {
    const references = extractReviewReferences(
      [
        "The team has [40 field workers](#cs \"40 field workers\").",
        "[Signal is patchy](#chat-msg-1 \"phone signal is patchy\").",
        "[This target is broken](#chat-msg-99 \"missing response\").",
      ].join("\n"),
      briefMarkdown,
      messages,
    );
    expect(references).toHaveLength(3);
    expect(references[0]).toMatchObject({ id: "ref-0", source: "brief", valid: true });
    expect(references[1]).toMatchObject({ id: "ref-1", source: "chat", messageIndex: 1, valid: true });
    expect(references[2]).toMatchObject({ id: "ref-2", source: "chat", valid: false });
  });

  it("does not treat a user message as client evidence", () => {
    const references = extractReviewReferences("[Question](#chat-msg-0 \"How is connectivity?\")", briefMarkdown, messages);
    expect(references[0]).toMatchObject({ valid: false });
    expect(references[0].invalidReason).toContain("not a client response");
  });
});

describe("parseReviewJson", () => {
  it("parses fenced JSON and rejects malformed JSON", () => {
    expect(parseReviewJson('```json\n{"ok": true}\n```')).toEqual({ ok: true });
    expect(() => parseReviewJson("not json")).toThrow(/malformed review JSON/);
  });
});
