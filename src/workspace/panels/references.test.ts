import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "@/cases/community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED } from "@/examples/community-room/seed";
import { parseDesignDoc } from "@/designDoc/parse";
import { buildReferences, plainText } from "./references";

describe("plainText", () => {
  it("turns citations into their labels and drops emphasis", () => {
    expect(plainText("**R3** Uses [Chat #4](#chat-msg-4) evidence.")).toBe("R3 Uses Chat #4 evidence.");
    expect(plainText("Because [R1](#R1), [R2](#R2). Trade-off: relies on D2.")).toBe(
      "Because R1, R2. Trade-off: relies on D2.",
    );
  });
});

describe("buildReferences", () => {
  const seed = COMMUNITY_ROOM_COMPLETE_SEED;
  const refs = buildReferences(
    parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, seed.messages),
    seed.messages,
  );

  it("looks up items, boxes (final diagram or sketch) and chat messages", () => {
    expect(refs.item("R4")).toContain("Phone bookings on sticky notes");
    expect(refs.item("A2")).toBeUndefined();
    expect(refs.item("D9")).toBeUndefined();
    expect(refs.box("Calendar")).toBe("Shared booking calendar");
    expect(refs.box("Resident")).toBe("Resident");
    expect(refs.chat(0)).toBe(COMMUNITY_ROOM_CASE.openingMessage);
  });
});
