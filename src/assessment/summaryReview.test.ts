import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED } from "../cases/community-room/seed";
import { parseDesignDoc, QUALITIES } from "../designDoc/parse";
import { rationaleEvidence, readIsoCritique, readRationale, readScenarioAdequacy } from "./summaryReview";

const seed = COMMUNITY_ROOM_COMPLETE_SEED;
const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, seed.messages);

describe("summary judge evidence", () => {
  it("keeps only rationale judgments with a quote from a linked item", () => {
    const links = rationaleEvidence(doc);
    const link = links.find((item) => item.sourceText && item.targetText)!;
    const found = readRationale([{ id: link.id, verdict: "sound", reason: "Supported", quote: link.sourceText.slice(0, 15) }], links);
    expect(found.find((item) => item.id === link.id)?.verdict).toBe("sound");
    expect(readRationale([{ id: link.id, verdict: "sound", quote: "fabricated quote" }], links).find((item) => item.id === link.id)?.verdict).toBe("uncertain");
  });

  it("returns one ISO 25010 entry per characteristic, dropping invented quotes and unknown references", () => {
    const raw = [{
      id: "reliability",
      verdict: "weak",
      summary: "Nothing recovers a failed booking.",
      weaknesses: [
        { point: "No retry anywhere", refs: ["R1", "R999"], quote: "invented" },
        { point: "Bookings are written once", refs: [], quote: "Bookings" },
      ],
    }];
    const critique = readIsoCritique(raw, new Set(["R1"]), seed.docMarkdown);

    expect(critique).toHaveLength(QUALITIES.length);
    expect(critique.map((item) => item.id)).toEqual([...QUALITIES]);
    const reliability = critique.find((item) => item.id === "reliability")!;
    expect(reliability.verdict).toBe("weak");
    // An unverifiable quote keeps the point but leaves it unquoted; an unknown ref is dropped.
    expect(reliability.weaknesses[0]).toEqual({ point: "No retry anywhere", refs: ["R1"] });
    expect(reliability.weaknesses[1].quote).toBe("Bookings");
    // A characteristic the judge said nothing about is not_addressed, not invented.
    expect(critique.find((item) => item.id === "security")).toMatchObject({ verdict: "not_addressed", strengths: [], weaknesses: [] });
  });

  it("keeps at most two points in each ISO column", () => {
    const raw = [{
      id: "security",
      verdict: "adequate",
      summary: "Some protection.",
      improvements: [1, 2, 3].map((n) => ({ point: `Point ${n}`, refs: [], quote: null })),
    }];
    expect(readIsoCritique(raw, new Set(), seed.docMarkdown).find((item) => item.id === "security")!.improvements).toHaveLength(2);
  });

  it("marks invalid selected diagram links unsound even if the judge says sound", () => {
    const scenario = COMMUNITY_ROOM_CASE.scenarios[0];
    const answer = { scenarioId: scenario.id, pickedDecisionIds: ["D1"], pickedNodeIds: ["not-a-box"], oneLiner: "The calendar rejects a clash.", notHandled: false };
    const raw = [{ scenarioId: scenario.id, decision: "sound", diagram: "sound", justification: "sound", reasons: {}, quotes: [{ source: "answer", text: answer.oneLiner }] }];
    const result = readScenarioAdequacy(raw, COMMUNITY_ROOM_CASE, [answer], doc, seed.docMarkdown);
    expect(result[0].diagram).toBe("unsound");
    expect(result[0].outcome).toBe("partly");
    expect(result[0].reasons.diagram).toContain("isn't a box");
  });
});
