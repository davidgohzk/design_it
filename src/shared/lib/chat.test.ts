import { describe, expect, it } from "vitest";
import { chatRequestMessages, finishReply, messageTimesOf } from "./chat";
import type { ChatMessage } from "./types";

describe("structured chat messages", () => {
  const messages: ChatMessage[] = [
    { role: "assistant", content: "Hi, I'm Mei", ts: 1 },
    { role: "user", content: "Who works at the desk?", ts: 2 },
    {
      role: "assistant",
      content: "Two of us, on alternating shifts.",
      ts: 3,
      disclosedFactIds: ["cr.staff"],
      guard: { action: "ok", leaks: [], phantoms: [] },
    },
  ];

  it("sends role and text, plus each client turn's fact ids, and nothing else", () => {
    expect(chatRequestMessages(messages)).toEqual([
      { role: "assistant", content: "Hi, I'm Mei" },
      { role: "user", content: "Who works at the desk?" },
      { role: "assistant", content: "Two of us, on alternating shifts.", disclosedFactIds: ["cr.staff"] },
    ]);
  });

  it("stamps a finished reply with its time, fact ids and guard log", () => {
    const reply = finishReply(
      { role: "assistant", content: "Two of us." },
      { model: "m", disclosedFactIds: ["cr.staff"], guard: { action: "regenerated", leaks: [], phantoms: [] } },
      42,
    );
    expect(reply).toEqual({
      role: "assistant",
      content: "Two of us.",
      ts: 42,
      disclosedFactIds: ["cr.staff"],
      guard: { action: "regenerated", leaks: [], phantoms: [] },
    });
  });

  it("leaves a plain-text reply without fact ids", () => {
    expect(finishReply({ role: "assistant", content: "Hi" }, { model: "m" }, 5)).toEqual({
      role: "assistant",
      content: "Hi",
      ts: 5,
    });
  });

  it("uses the fallback time for seeded messages", () => {
    expect(messageTimesOf([...messages, { role: "user", content: "Seeded" }], 99)).toEqual([1, 2, 3, 99]);
  });
});
