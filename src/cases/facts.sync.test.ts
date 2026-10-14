// Each case's facts must match its <case>.facts.json. The backend keeps an identical copy of each
// file in design_it_backend/app/cases/ and checks its personas against it, so both sides stay in sync.
import { describe, expect, it } from "vitest";
import { BRIGHTPATH_CASE } from "./brightpath";
import brightpathFacts from "./brightpath.facts.json";
import { COMMUNITY_ROOM_CASE } from "./community-room";
import communityRoomFacts from "./community-room.facts.json";
import type { CaseDefinition, CaseFact } from "./types";

const SHARED_FIELDS = [
  "id",
  "detail",
  "disclosure",
  "topicArea",
  "keywords",
  "signaturePhrases",
  "parentFactId",
  "probeCues",
] as const satisfies readonly (keyof CaseFact)[];

const shared = (fact: Partial<CaseFact>) =>
  Object.fromEntries(SHARED_FIELDS.filter((field) => fact[field] !== undefined).map((field) => [field, fact[field]]));

const CASES: [CaseDefinition, { caseId: string; facts: Partial<CaseFact>[] }][] = [
  [COMMUNITY_ROOM_CASE, communityRoomFacts as { caseId: string; facts: Partial<CaseFact>[] }],
  [BRIGHTPATH_CASE, brightpathFacts as { caseId: string; facts: Partial<CaseFact>[] }],
];

describe.each(CASES)("%s facts", (caseDefinition, file) => {
  it("match the shared facts file, in order", () => {
    expect(file.caseId).toBe(caseDefinition.id);
    expect(caseDefinition.facts.map(shared)).toEqual(file.facts.map(shared));
  });

  it("keep keywords, phrases and cues lowercase", () => {
    for (const fact of caseDefinition.facts) {
      for (const word of [...fact.keywords, ...fact.signaturePhrases, ...(fact.probeCues ?? [])]) {
        expect(word).toBe(word.toLowerCase());
      }
    }
  });

  it("give on-probe facts, and only them, a parent and probe cues", () => {
    const ids = caseDefinition.facts.map((fact) => fact.id);
    for (const fact of caseDefinition.facts) {
      if (fact.disclosure === "on-probe") {
        expect(ids).toContain(fact.parentFactId);
        expect(fact.probeCues?.length).toBeGreaterThan(0);
      } else {
        expect(fact.parentFactId).toBeUndefined();
        expect(fact.probeCues).toBeUndefined();
      }
    }
  });

  it("point scenarios at facts and expected decisions that exist", () => {
    const factIds = new Set(caseDefinition.facts.map((fact) => fact.id));
    const decisionIds = new Set(caseDefinition.expectedDecisions.map((decision) => decision.id));
    expect(caseDefinition.scenarios.length).toBeGreaterThan(0);
    for (const scenario of caseDefinition.scenarios) {
      for (const id of scenario.linkedFactIds) expect(factIds).toContain(id);
      for (const id of scenario.expectedDecisionKeys) expect(decisionIds).toContain(id);
      expect(scenario.goodAnswerNotes).not.toBe("");
    }
  });
});

describe("community-room content (handover §7)", () => {
  it("has one on-probe fact, the root cause, under the current process", () => {
    const onProbe = COMMUNITY_ROOM_CASE.facts.filter((fact) => fact.disclosure === "on-probe");
    expect(onProbe.map((fact) => [fact.id, fact.parentFactId])).toEqual([["cr.root-cause", "cr.current"]]);
  });

  it("has the three scenarios and four rubric anchors", () => {
    expect(COMMUNITY_ROOM_CASE.scenarios.map((scenario) => scenario.id)).toEqual([
      "sc.clash",
      "sc.no-smartphone",
      "sc.right-size",
    ]);
    expect(COMMUNITY_ROOM_CASE.rubricAnchors).toHaveLength(4);
  });
});
