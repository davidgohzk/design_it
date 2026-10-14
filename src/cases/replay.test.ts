import { describe, expect, it } from "vitest";
import { BRIGHTPATH_CASE } from "./brightpath";
import { COMMUNITY_ROOM_CASE } from "./community-room";
import { BRIGHTPATH_REPLAY, COMMUNITY_ROOM_REPLAY } from "./replay";

describe.each([
  [COMMUNITY_ROOM_CASE, COMMUNITY_ROOM_REPLAY],
  [BRIGHTPATH_CASE, BRIGHTPATH_REPLAY],
])("replay scripts for $id", (caseDefinition, suite) => {
  const factIds = new Set(caseDefinition.facts.map((fact) => fact.id));

  it("has 20 to 30 scripts with unique ids", () => {
    expect(suite.caseId).toBe(caseDefinition.id);
    expect(suite.scripts.length).toBeGreaterThanOrEqual(20);
    expect(suite.scripts.length).toBeLessThanOrEqual(30);
    expect(new Set(suite.scripts.map((script) => script.id)).size).toBe(suite.scripts.length);
  });

  it("names only real facts, never one that is both required and forbidden", () => {
    for (const script of suite.scripts) {
      expect(script.messages.length).toBeGreaterThan(0);
      for (const id of [...script.mustDisclose, ...script.mustNotDisclose]) expect(factIds).toContain(id);
      expect(script.mustDisclose.filter((id) => script.mustNotDisclose.includes(id))).toEqual([]);
    }
  });

  it("includes near-miss scripts that must not give a fact away", () => {
    expect(suite.scripts.filter((script) => script.mustDisclose.length === 0).length).toBeGreaterThanOrEqual(5);
  });
});
