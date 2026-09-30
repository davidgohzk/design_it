import { describe, expect, it } from "vitest";
import { BRIGHTPATH_CASE } from "../../../cases/brightpath";
import { BRIGHTPATH_SEED } from "../../../cases/brightpath.seed";
import { parseDesignDoc } from "../../../designDoc/parse";
import { buildReferences, plainText } from "./references";

describe("plainText", () => {
  it("turns citations into their labels and drops emphasis", () => {
    expect(
      plainText('**R3** Supervisors are looped in — [Chat #4](#chat-msg-4 "need to (sometimes) be \\"looped\\" in")'),
    ).toBe("R3 Supervisors are looped in — Chat #4");
    expect(plainText("Because [R1](#R1), [R6](#R6). Trade-off: relies on A2.")).toBe(
      "Because R1, R6. Trade-off: relies on A2.",
    );
  });
});

describe("buildReferences", () => {
  const seed = BRIGHTPATH_SEED;
  const refs = buildReferences(
    parseDesignDoc(seed.docMarkdown, seed.finalCode, BRIGHTPATH_CASE.briefMarkdown, seed.messages),
    seed.messages,
  );

  it("looks up items, boxes (final diagram or sketch) and chat messages", () => {
    expect(refs.item("R4")).toBe("The team gets 15 to 20 incident reports on a busy day — Chat #4");
    expect(refs.item("A2")).toMatch(/^Field workers always have a mobile signal/);
    expect(refs.item("D9")).toBeUndefined();
    expect(refs.box("DB")).toBe("Incident database");
    // Only in D5's sketch, not the final diagram.
    expect(refs.box("Reports")).toBe("Donor reports");
    expect(refs.chat(0)).toBe(BRIGHTPATH_CASE.openingMessage);
  });
});
