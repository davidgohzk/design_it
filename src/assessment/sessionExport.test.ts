import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "../cases/community-room";
import { COMMUNITY_ROOM_SEED } from "../cases/community-room/seed";
import { parseDesignDoc } from "../designDoc/parse";
import type { Intake } from "./intake";
import { completeIntake, intakeProblems, intakeRequired } from "./intake";
import { buildSessionExport, importSessionExport } from "./sessionExport";

const intake: Intake = {
  yearsFullTime: 3,
  clientInterviews: "1-5",
  requirementsWork: true,
  requirementsYears: 1,
  systemDesignInterviews: 2,
  aiForCoding: "daily",
  githubPullRequests: "weekly",
  vsCode: "daily",
  bookingFamiliarity: 2,
};

function sampleExport() {
  const seed = COMMUNITY_ROOM_SEED;
  const started = Date.parse("2026-10-14T09:00:00Z");
  const messages = seed.messages.map((message, index) => ({
    ...message,
    ts: started + index * 30_000,
    ...(message.role === "assistant" && index > 0 ? { model: "persona-model", disclosedFactIds: [], guard: { action: "ok" as const, leaks: [], phantoms: [] } } : {}),
  }));
  return buildSessionExport({
    caseDefinition: COMMUNITY_ROOM_CASE,
    mode: "research",
    startedAt: started,
    messages,
    messageTimes: messages.map((message) => message.ts),
    docMarkdown: seed.docMarkdown,
    parsed: parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, messages),
    finalCode: seed.finalCode,
    finalHistory: [{ source: "manual", code: seed.finalCode, at: started + 600_000 }],
    diagramTurns: seed.diagramTurns,
    timeline: [{ id: "t1", at: started + 5_000, type: "quote", summary: "Chat #2", detail: "paper book", target: "Design doc" }],
    aiEvents: [{ kind: "diagram", prompt: "draw it", at: started + 400_000, ok: true, model: "diagram-model" }],
    chatMeta: [{ model: "persona-model" }],
    interviewEnd: { at: started + 900_000, how: "button", reason: "I have enough to start" },
    answers: seed.answers,
    intake,
    feedback: [{ caseId: "community-room", item: "ask:cr.staff", verdict: "wrong", timestamp: started + 2_000_000 }],
    assessment: seed.review,
    assessmentHistory: [seed.review],
    processMeasures: { questions: 5, timeToFirstSurfacedFactMs: 60_000, timeOnTaskMs: 1_800_000, diagramPrompts: 1, aiCreatedNodeShare: 0.5 },
    now: started + 3_000_000,
  });
}

describe("session export (WP12)", () => {
  it("holds everything the study needs", () => {
    const data = sampleExport();
    expect(data.intake).toEqual(intake);
    expect(data.transcript[2]).toMatchObject({ model: "persona-model", disclosedFactIds: [], guard: { action: "ok" } });
    expect(data.scenarioAnswers).toHaveLength(3);
    expect(data.feedback).toEqual([expect.objectContaining({ item: "ask:cr.staff", verdict: "wrong" })]);
    // Every judge run is kept in the review.
    expect(data.assessment?.justify.items.find((item) => item.itemId === "D2")?.runs).toEqual(["sound", "sound", "weak"]);
    expect(data.models.diagram).toEqual([expect.objectContaining({ model: "diagram-model" })]);
    // The file says what it is with `format`, not with a version of the app or the schema. The review's
    // own checklistVersion / promptVersion are a different thing: they say which checklist and which
    // judge prompt produced a result, which the study needs.
    expect(Object.keys(data)).not.toContain("version");
    expect(data.assessment?.process.bano?.checklistVersion).toBe("bano2019-appA-v1");
  });

  it("round-trips: export, import, export again gives the same file", () => {
    const original = sampleExport();
    const imported = importSessionExport(JSON.parse(JSON.stringify(original)));
    const again = buildSessionExport({ ...imported, now: imported.exportedAt });
    expect(again).toEqual(original);
    expect(imported.messages[2].ts).toBe(Date.parse("2026-10-14T09:01:00Z"));
  });

  it("refuses a file that isn't a session export", () => {
    expect(() => importSessionExport({ format: "something else" })).toThrow("isn't a design_it session file");
    expect(() => importSessionExport("not json")).toThrow();
  });
});

describe("intake (WP12)", () => {
  it("is required in research mode only", () => {
    expect(intakeRequired("research")).toBe(true);
    expect(intakeRequired("practice")).toBe(false);
    expect(intakeRequired("assessment")).toBe(false);
  });

  it("lists what is missing, and saves a complete answer", () => {
    expect(intakeProblems({})).toHaveLength(8);
    expect(intakeProblems(intake)).toEqual([]);
    expect(completeIntake({ ...intake, requirementsWork: false, requirementsYears: 7 })).toMatchObject({ requirementsYears: 0 });
    expect(completeIntake({ ...intake, bookingFamiliarity: 9 as never })).toBeNull();
  });
});
