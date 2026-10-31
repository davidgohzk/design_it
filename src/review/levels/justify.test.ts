import { describe, expect, it } from "vitest";
import { BRIEF, GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "@/examples/community-room/fixtures";
import { parseDesignDoc } from "@/designDoc/parse";
import { combineJustifyRuns, justifyInputs, readJustifyRun, sketchItemId } from "./justify";
import { quoteFound } from "@/review/judge/quotes";

const doc = parseDesignDoc(GOLDEN_DOC, GOLDEN_FINAL, BRIEF, GOLDEN_TRANSCRIPT);
const sources = { doc: GOLDEN_DOC, brief: BRIEF, messages: GOLDEN_TRANSCRIPT };

/** A mocked judge reply giving every sent item the same verdict, quoting its first words. */
const reply = (verdict: string, quote = (text: string) => text.split(" ").slice(0, 4).join(" ")) =>
  justifyInputs(doc).send.map((item) => ({
    itemId: item.itemId,
    verdict,
    reason: `It is ${verdict}.`,
    quotes: [{ source: "doc", text: quote(item.text) }],
  }));

describe("Justify: what is sent", () => {
  it("sends every R#, D# and sketch of the golden doc, and skips nothing", () => {
    const { send, skipped } = justifyInputs(doc);
    expect(send.map((item) => item.itemId)).toEqual([
      "R1", "R2", "R3", "R4", "R5",
      "D1", sketchItemId("D1"), "D2", sketchItemId("D2"), "D3", sketchItemId("D3"), "D4", sketchItemId("D4"), "D5", sketchItemId("D5"),
    ]);
    expect(skipped).toEqual([]);
    expect(send[5]).toMatchObject({ kind: "decision", because: [{ id: "R1" }, { id: "R4" }], insteadOf: "keep the paper book and add a phone log" });
  });

  it("gives an item that fails lint skipped_lint, without sending it to the AI", () => {
    const flawed = parseDesignDoc(
      GOLDEN_DOC.replace(/- \*\*R2\*\* ([^\n—]*) — [^\n]*/, "- **R2** $1")
        .replace("  - Instead of: staff check the calendar by eye before saving\n", ""),
      GOLDEN_FINAL,
      BRIEF,
      GOLDEN_TRANSCRIPT,
    );
    const { send, skipped } = justifyInputs(flawed);
    expect(skipped.map((item) => [item.itemId, item.verdict, item.method])).toEqual([
      ["R2", "skipped_lint", "code"],
      ["D3", "skipped_lint", "code"],
    ]);
    expect(send.map((item) => item.itemId)).not.toContain("R2");
    expect(send.map((item) => item.itemId)).not.toContain("D3");
    // D3's sketch is still judged on its own.
    expect(send.map((item) => item.itemId)).toContain(sketchItemId("D3"));
  });
});

describe("Justify: verdicts from mocked runs", () => {
  const { send } = justifyInputs(doc);

  it.each(["sound", "weak", "unsound"])("keeps a unanimous %s verdict backed by verified quotes", (verdict) => {
    const runs = [1, 2, 3].map(() => readJustifyRun(reply(verdict), send, sources));
    const items = combineJustifyRuns(send, runs);
    expect(items.every((item) => item.verdict === verdict && item.method === "ai_verified_quote")).toBe(true);
    expect(items[0]).toMatchObject({ itemId: "R1", reason: `It is ${verdict}.`, runs: [verdict, verdict, verdict] });
    expect(items[0].quotes).toEqual(["Bookings live in one"]);
  });

  it("makes an item uncertain when its quote is fabricated", () => {
    const discarded = { count: 0 };
    const fabricated = reply("sound", () => "the centre has a booking app already");
    const runs = [1, 2, 3].map(() => readJustifyRun(fabricated, send, sources, discarded));
    const items = combineJustifyRuns(send, runs);
    expect(items.every((item) => item.verdict === "uncertain" && item.quotes.length === 0)).toBe(true);
    expect(discarded.count).toBe(send.length * 3);
  });

  it("makes a split vote uncertain, and keeps every run", () => {
    const runs = [readJustifyRun(reply("sound"), send, sources), readJustifyRun(reply("sound"), send, sources), readJustifyRun(reply("weak"), send, sources)];
    const [first] = combineJustifyRuns(send, runs);
    expect(first).toMatchObject({ verdict: "uncertain", runs: ["sound", "sound", "weak"], method: "ai_judgment" });
  });

  it("makes an item a run left out uncertain", () => {
    const partial = reply("sound").slice(1);
    const items = combineJustifyRuns(send, [1, 2, 3].map(() => readJustifyRun(partial, send, sources)));
    expect(items[0]).toMatchObject({ itemId: "R1", verdict: "uncertain" });
    expect(items[1]).toMatchObject({ itemId: "R2", verdict: "sound" });
  });

  it("ignores unknown items and invalid verdicts, and cuts a long reason to 25 words", () => {
    const raw = [
      { itemId: "R9", verdict: "sound", quotes: [{ source: "doc", text: "Bookings" }] },
      { itemId: "R1", verdict: "great", quotes: [{ source: "doc", text: "Bookings" }] },
      { itemId: "R2", verdict: "weak", reason: Array.from({ length: 40 }, () => "word").join(" "), quotes: [{ source: "chat", text: "about 30 bookings a week" }] },
    ];
    const run = readJustifyRun(raw, send, sources);
    expect([...run.keys()]).toEqual(["R2"]);
    expect(run.get("R2")!.reason!.split(" ")).toHaveLength(25);
  });
});

describe("quote verification (rule 2)", () => {
  it("matches after whitespace and punctuation are normalised, never a paraphrase", () => {
    expect(quoteFound("We get about 30 bookings a week, more during the school holidays.", "about 30 bookings a week")).toBe(true);
    expect(quoteFound("isn't always in front of them", "isn’t always in front  of them")).toBe(true);
    expect(quoteFound("Staff — two of them — share it.", "Staff two of them share it")).toBe(true);
    expect(quoteFound("about 30 bookings a week", "around 30 bookings a week")).toBe(false);
    expect(quoteFound("bookings", "")).toBe(false);
    // Whole words only: "book" is not found inside "booking".
    expect(quoteFound("a booking", "a book")).toBe(false);
  });
});
