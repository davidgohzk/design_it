import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import { GOLDEN_TRANSCRIPT } from "../cases/community-room/fixtures";
import type { ChatMessage } from "../shared/lib/types";
import { checkFairness, clientFailures, inventedSpecifics, sessionComplete } from "./fairness";

const CR = COMMUNITY_ROOM_CASE;
const ended = { at: 1, how: "button" as const, reason: "I have enough to start" };

describe("Gate: client failures", () => {
  it("flags a 'why' question whose reply leaves out the sticky notes", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: CR.openingMessage },
      { role: "user", content: "Why do you think the double bookings happen?" },
      { role: "assistant", content: "People just turn up at the same time, it's a mess." },
    ];
    expect(clientFailures(CR.facts, messages)).toEqual([
      { factId: "cr.root-cause", messageIndex: 1, quote: "Why do you think the double bookings happen?" },
    ]);
  });

  it("doesn't flag a general question that the root cause can't answer", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: CR.openingMessage },
      { role: "user", content: "What problems do you have?" },
      { role: "assistant", content: "Double bookings keep happening and people go home upset." },
    ];
    expect(clientFailures(CR.facts, messages)).toEqual([]);
  });

  it("doesn't flag a fact the client gave later in the session", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: CR.openingMessage },
      { role: "user", content: "Who works at the desk?" },
      { role: "assistant", content: "Sorry, could you say that again?" },
      { role: "user", content: "Who works at the desk?" },
      { role: "assistant", content: "Two of us on alternating shifts, and we share one computer." },
    ];
    expect(clientFailures(CR.facts, messages)).toEqual([]);
  });

  it("uses the server's fact ids when a reply has them", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: CR.openingMessage },
      { role: "user", content: "Who works at the desk?" },
      { role: "assistant", content: "Me and a colleague, taking turns.", disclosedFactIds: ["cr.staff"] },
    ];
    expect(clientFailures(CR.facts, messages)).toEqual([]);
  });

  it("skips a question whose reply crashed", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: CR.openingMessage },
      { role: "user", content: "Who works at the desk?" },
      { role: "assistant", content: "Request failed: timeout" },
    ];
    expect(clientFailures(CR.facts, messages)).toEqual([]);
  });

  it("finds no failures in the golden interview", () => {
    expect(clientFailures(CR.facts, GOLDEN_TRANSCRIPT)).toEqual([]);
  });
});

describe("Gate: invented specifics", () => {
  it("flags an invented $20 fee", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: CR.openingMessage },
      { role: "user", content: "Do people pay to book?" },
      { role: "assistant", content: "Groups pay a $20 fee for the hall." },
    ];
    expect(inventedSpecifics(CR, messages)).toEqual([{ messageIndex: 2, text: "$20" }]);
  });

  it("flags an invented name and number of rooms", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: CR.openingMessage },
      { role: "user", content: "How many rooms?" },
      { role: "assistant", content: "We have four rooms, and Mr Tan looks after them." },
    ];
    expect(inventedSpecifics(CR, messages).map((item) => item.text)).toEqual(["four", "Mr Tan"]);
  });

  it("accepts numbers and names the case already has, in digits or words", () => {
    expect(inventedSpecifics(CR, GOLDEN_TRANSCRIPT)).toEqual([]);
  });
});

describe("Gate: session complete", () => {
  it("needs every reply to arrive and the interview to have ended", () => {
    expect(sessionComplete(GOLDEN_TRANSCRIPT, ended)).toBe(true);
    expect(sessionComplete(GOLDEN_TRANSCRIPT, null)).toBe(false);
  });

  it("puts the three checks together", () => {
    expect(checkFairness(CR, GOLDEN_TRANSCRIPT, ended)).toEqual({
      clientFailed: [],
      inventedSpecifics: [],
      sessionComplete: true,
    });
  });
});
