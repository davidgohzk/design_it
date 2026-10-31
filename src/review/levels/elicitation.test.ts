import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "@/cases/community-room";
import type { ChatMessage } from "@/lib/types";
import { computeElicitation, readTurnLabels, turnEvidence } from "./elicitation";

const caseDefinition = { ...COMMUNITY_ROOM_CASE, facts: COMMUNITY_ROOM_CASE.facts.filter((fact) => ["cr.current", "cr.scale", "cr.bookers", "cr.root-cause"].includes(fact.id)) };
const messages: ChatMessage[] = [
  { role: "user", content: "How many rooms do you have?" },
  { role: "assistant", content: "Three rooms.", disclosedFactIds: ["cr.scale"] },
  { role: "user", content: "Who books?" },
  { role: "assistant", content: "I cannot say.", disclosedFactIds: [] },
  { role: "user", content: "Who makes the bookings?" },
  { role: "assistant", content: "Mostly residents' groups.", disclosedFactIds: ["cr.bookers"] },
];

describe("elicitation metrics", () => {
  it("uses all hidden ground truth for IRE and actual disclosures for ESR", () => {
    const result = computeElicitation(caseDefinition, messages, [
      { messageIndex: 0, actionType: "clarify", targetIds: ["cr.scale"], reasoning: "Clarifies volume" },
      { messageIndex: 2, actionType: "probe", targetIds: ["cr.bookers"], reasoning: "Asks who books" },
      { messageIndex: 4, actionType: "probe", targetIds: ["cr.bookers"], reasoning: "Reasks" },
    ]);
    expect(result.ire).toMatchObject({ numerator: 2, denominator: 3 });
    expect(result.clarificationEsr).toMatchObject({ numerator: 1, denominator: 1 });
    expect(result.probingEsr).toMatchObject({ numerator: 1, denominator: 2 });
    expect(result.turns.map((turn) => turn.keyQuestion)).toEqual([true, true, false]);
    expect(result.tkqr.value).toBeCloseTo((1 + 1 / Math.log2(3)) / (1 + 1 / Math.log2(3) + 1 / Math.log2(4)));
  });

  it("accepts only IDs still hidden at each turn and shows n/a without labels", () => {
    const evidence = turnEvidence(caseDefinition, messages);
    expect(evidence.turns[1].remainingRequirements.map((fact) => fact.id)).not.toContain("cr.scale");
    const labels = readTurnLabels([{ messageIndex: 2, action_type: "probe", relevant_implicit_requirement_ids: ["cr.scale", "cr.bookers", "fake"], reasoning: "asks" }], caseDefinition, messages);
    expect(labels[0].targetIds).toEqual(["cr.bookers"]);
    const unlabeled = computeElicitation(caseDefinition, messages, []);
    expect(unlabeled.tkqr.value).toBeNull();
    expect(unlabeled.probingEsr.value).toBeNull();
  });

  it("awards one TKQR hit to a multi-target question and handles zero denominators", () => {
    const one: ChatMessage[] = [
      { role: "user", content: "Tell me who books and how many rooms there are." },
      { role: "assistant", content: "Three rooms and mostly residents' groups.", disclosedFactIds: ["cr.scale", "cr.bookers"] },
    ];
    const multi = computeElicitation(caseDefinition, one, [{ messageIndex: 0, actionType: "probe", targetIds: ["cr.scale", "cr.bookers"], reasoning: "Two topics" }]);
    expect(multi.ire).toMatchObject({ numerator: 2, denominator: 3 });
    expect(multi.tkqr).toMatchObject({ numerator: 1, denominator: 1, value: 1 });
    const empty = computeElicitation({ ...caseDefinition, facts: caseDefinition.facts.filter((fact) => fact.disclosure === "given") }, [], []);
    expect(empty.ire.value).toBeNull();
    expect(empty.tkqr.value).toBeNull();
  });
});
