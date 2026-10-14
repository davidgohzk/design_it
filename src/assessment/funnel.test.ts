import { describe, expect, it } from "vitest";
import { BRIGHTPATH_CASE } from "../cases/brightpath";
import { BRIGHTPATH_COMPLETE_SEED, BRIGHTPATH_SEED } from "../cases/brightpath.seed";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import { FLAWED_DOC, FLAWED_FINAL, GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import type { CaseDefinition } from "../cases";
import { checkConsistency } from "../designDoc/consistency";
import { parseDesignDoc } from "../designDoc/parse";
import type { ChatMessage } from "../shared/lib/types";
import { clientFailures } from "./fairness";
import { computeFunnel } from "./funnel";
import type { FunnelVerdicts } from "./funnel";

function funnel(caseDefinition: CaseDefinition, messages: ChatMessage[], doc: string, final: string, verdicts?: FunnelVerdicts) {
  const parsed = parseDesignDoc(doc, final, caseDefinition.briefMarkdown, messages);
  return computeFunnel({
    caseDefinition,
    messages,
    doc: parsed,
    consistency: checkConsistency(parsed),
    clientFailed: clientFailures(caseDefinition.facts, messages),
    verdicts,
  });
}

const states = (result: ReturnType<typeof funnel>) => Object.fromEntries(result.ask.facts.map((fact) => [fact.factId, fact.state]));

describe("fact funnel (community-room)", () => {
  it("golden fixture: cr.current is given and the other four are carried through", () => {
    const result = funnel(COMMUNITY_ROOM_CASE, GOLDEN_TRANSCRIPT, GOLDEN_DOC, GOLDEN_FINAL);
    expect(states(result)).toEqual({
      "cr.current": "given",
      "cr.scale": "carried_through",
      "cr.bookers": "carried_through",
      "cr.root-cause": "carried_through",
      "cr.staff": "carried_through",
    });
    expect(result.ask.onProbe).toEqual({ found: 1, eligible: 1 });
    expect(result.ask.onAsk).toEqual({ found: 3, eligible: 3 });
    expect(result.keep).toMatchObject({
      givenCarried: { carried: 1, total: 1 },
      uncitedRequirements: [],
      unsupportedDecisions: [],
      unjustifiedNodes: [],
      unexplainedEdges: [],
    });
    expect(result.keep.traces.find((trace) => trace.factId === "cr.root-cause")).toEqual({
      factId: "cr.root-cause",
      requirementIds: ["R4"],
      decisionIds: ["D1", "D2"],
      drawn: true,
      state: "carried_through",
    });
    expect(result.ask.facts.every((fact) => fact.method === "code")).toBe(true);
    expect(result.pending).toEqual({ assertions: [], matches: [] });
  });

  it("flawed fixture (R4 deleted): cr.root-cause is dropped", () => {
    const result = funnel(COMMUNITY_ROOM_CASE, GOLDEN_TRANSCRIPT, FLAWED_DOC, FLAWED_FINAL);
    expect(states(result)["cr.root-cause"]).toBe("dropped");
    expect(result.keep.unsupportedDecisions).toEqual(["D1", "D2"]);
    expect(result.keep.unjustifiedNodes).toEqual(["Queue"]);
    // D3's sketch is gone, so its refusal arrow is unexplained too.
    expect(result.keep.unexplainedEdges).toEqual([
      { from: "Calendar", to: "Desk" },
      { from: "Desk", to: "Queue" },
    ]);
  });

  // The interview never asks why: messages 7 and 8 talk about something else, so the root cause is
  // never disclosed (indexes stay the same, so the other citations still verify).
  const unprobed: ChatMessage[] = GOLDEN_TRANSCRIPT.map((message, index) =>
    index === 7
      ? { role: "user", content: "What would you like from a new system?" }
      : index === 8
        ? { role: "assistant", content: "Just for people to stop turning up to a room someone else has booked." }
        : message,
  );
  /** The golden doc without R4 and without D1's mention of sticky notes. */
  const withoutRootCause = GOLDEN_DOC.replace(/- \*\*R4\*\*[^\n]*\n/, "").replace(
    "the book and sticky notes are retired",
    "the book is retired",
  );

  it("an unasked fact listed in an A# is assumed openly", () => {
    const doc = withoutRootCause.replace(
      "## Decisions",
      "- **A3** Phone bookings get written on sticky notes and lost\n  - Would confirm by asking: How do phone bookings get into the book?\n\n## Decisions",
    );
    const result = funnel(COMMUNITY_ROOM_CASE, unprobed, doc, GOLDEN_FINAL);
    expect(result.ask.facts.find((fact) => fact.factId === "cr.root-cause")).toMatchObject({ state: "assumed_openly", method: "code" });
    expect(result.ask.onProbe).toEqual({ found: 0, eligible: 1 });
  });

  it("the same fact stated in an R# with no citation is assumed silently", () => {
    const doc = withoutRootCause.replace("## Assumptions", "- **R4** Phone bookings on sticky notes don't always reach the book\n\n## Assumptions");
    const result = funnel(COMMUNITY_ROOM_CASE, unprobed, doc, GOLDEN_FINAL);
    expect(states(result)["cr.root-cause"]).toBe("assumed_silently");
    expect(result.keep.uncitedRequirements).toEqual(["R4"]);
  });

  it("a borderline single-keyword mention asks the AI once; a fabricated quote (rejected) leaves it missed", () => {
    const doc = withoutRootCause;
    const first = funnel(COMMUNITY_ROOM_CASE, unprobed, doc, GOLDEN_FINAL);
    // R1 says "double bookings", one of the root cause's keywords: borderline.
    expect(first.pending.assertions).toEqual([
      expect.objectContaining({ factId: "cr.root-cause", itemId: "R1", keyword: "double booking" }),
    ]);
    expect(states(first)["cr.root-cause"]).toBe("missed");
    // The AI's quote didn't verify, so the caller passes null.
    const rejected = funnel(COMMUNITY_ROOM_CASE, unprobed, doc, GOLDEN_FINAL, { assertions: { "cr.root-cause": null } });
    expect(states(rejected)["cr.root-cause"]).toBe("missed");
    expect(rejected.pending.assertions).toEqual([]);
    // A verified quote would make it assumed silently, labelled as such.
    const verified = funnel(COMMUNITY_ROOM_CASE, unprobed, doc, GOLDEN_FINAL, { assertions: { "cr.root-cause": "double bookings keep happening" } });
    expect(verified.ask.facts.find((fact) => fact.factId === "cr.root-cause")).toMatchObject({
      state: "assumed_silently",
      method: "ai_verified_quote",
    });
  });

  it("scores a never-found fact once: missed, with no Keep trace", () => {
    const result = funnel(COMMUNITY_ROOM_CASE, unprobed, withoutRootCause, GOLDEN_FINAL, {
      assertions: { "cr.root-cause": null },
    });
    expect(states(result)["cr.root-cause"]).toBe("missed");
    expect(result.keep.traces.map((trace) => trace.factId)).not.toContain("cr.root-cause");
  });

  it("asks the AI when a requirement cites the disclosing message without naming the fact", () => {
    // R5 keeps its citation but names nothing of the fact: no keyword, no signature phrase.
    const doc = GOLDEN_DOC.replace(
      "- **R5** Two staff on shifts share one desk computer",
      "- **R5** The front of house is covered all week",
    );
    const first = funnel(COMMUNITY_ROOM_CASE, GOLDEN_TRANSCRIPT, doc, GOLDEN_FINAL);
    expect(first.pending.matches).toEqual([expect.objectContaining({ factId: "cr.staff", requirementId: "R5" })]);
    expect(states(first)["cr.staff"]).toBe("dropped");
    const matched = funnel(COMMUNITY_ROOM_CASE, GOLDEN_TRANSCRIPT, doc, GOLDEN_FINAL, { matches: { "cr.staff|R5": true } });
    expect(matched.ask.facts.find((fact) => fact.factId === "cr.staff")).toMatchObject({ state: "carried_through", method: "ai_verified_quote" });
  });

  it("uses the server's fact ids, and excludes a client failure from the on-probe rate", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: COMMUNITY_ROOM_CASE.openingMessage, ts: 0 },
      { role: "user", content: "Why do the double bookings happen?", ts: 30_000 },
      { role: "assistant", content: "They just do, honestly.", ts: 40_000, disclosedFactIds: [] },
    ];
    const result = funnel(COMMUNITY_ROOM_CASE, messages, GOLDEN_DOC, GOLDEN_FINAL);
    expect(states(result)["cr.root-cause"]).toBe("client_failed");
    expect(result.ask.onProbe).toEqual({ found: 0, eligible: 0 });
    expect(result.ask.timeToFirstProbeSec).toBe(30);
  });
});

describe("fact funnel (BrightPath)", () => {
  it("golden (complete example): every on-ask fact is carried through and every given fact reaches an R#", () => {
    const seed = BRIGHTPATH_COMPLETE_SEED;
    const result = funnel(BRIGHTPATH_CASE, seed.messages, seed.docMarkdown, seed.finalCode);
    expect(Object.values(states(result))).toEqual([
      "given",
      "carried_through",
      "carried_through",
      "carried_through",
      "carried_through",
      "carried_through",
      "carried_through",
      "given",
      "given",
      "given",
    ]);
    expect(result.keep.givenCarried).toEqual({ carried: 4, total: 4 });
    // No on-probe facts in this case: the primary measure is n/a.
    expect(result.ask.onProbe).toEqual({ found: 0, eligible: 0 });
  });

  it("flawed sample: a fact at every link of the chain", () => {
    const seed = BRIGHTPATH_SEED;
    const result = funnel(BRIGHTPATH_CASE, seed.messages, seed.docMarkdown, seed.finalCode);
    expect(states(result)).toEqual({
      "brightpath.0": "given",
      "brightpath.1": "dropped",
      "brightpath.2": "carried_through",
      "brightpath.3": "not_drawn",
      "brightpath.4": "unused",
      "brightpath.5": "client_failed",
      "brightpath.6": "assumed_openly",
      "brightpath.7": "given",
      "brightpath.8": "given",
      "brightpath.9": "given",
    });
    expect(result.keep.givenCarried).toEqual({ carried: 1, total: 4 });
    expect(result.keep.uncitedRequirements).toEqual(["R5", "R6"]);
    expect(result.keep.unsupportedDecisions).toEqual(["D4"]);
    // The dashboard is in no sketch; the supervisor is a person, so C3 doesn't ask for one.
    expect(result.keep.unjustifiedNodes).toEqual(["Dashboard"]);
  });
});
