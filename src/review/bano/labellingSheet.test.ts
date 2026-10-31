import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "@/cases/community-room";
import { COMMUNITY_ROOM_SEED } from "@/examples/community-room/seed";
import { tagMessages } from "@/review/levels/questionTags";
import { runBanoCheck } from "@/review/bano";
import { agreement, agreementReport, cohensKappa, labellingSheet, readSheet, SHEET_COLUMNS } from "./labellingSheet";

const report = runBanoCheck({
  caseDefinition: COMMUNITY_ROOM_CASE,
  messages: COMMUNITY_ROOM_SEED.messages,
  tags: tagMessages(COMMUNITY_ROOM_SEED.messages).tags,
});

const sheet = labellingSheet([{ sessionId: "s1", caseId: "community-room", mode: "research", report }]);

describe("the labelling sheet", () => {
  it("has a header and one row per item, including the ones not observed", () => {
    const lines = sheet.trim().split("\n");
    expect(lines[0].split("\t")).toEqual([...SHEET_COLUMNS]);
    expect(lines).toHaveLength(34);
    expect(readSheet(sheet).filter((row) => row.autoStatus === "not_observed").length).toBeGreaterThan(0);
  });

  it("leaves the two human columns blank, and carries the config hash", () => {
    const rows = readSheet(sheet);
    expect(rows[0].humanStatus).toBe("");
    expect(rows[0].humanNote).toBe("");
    expect(rows[0].configHash).toBe(report.configHash);
  });

  it("never lets a quote break the row apart", () => {
    const withTabs = labellingSheet([
      {
        sessionId: "s2",
        caseId: "community-room",
        mode: "research",
        report: { ...report, items: [{ ...report.items[0], evidence: [{ messageIndex: 1, quote: "a\tb\nc" }] }] },
      },
    ]);
    expect(withTabs.trim().split("\n")).toHaveLength(2);
    expect(readSheet(withTabs)[0].quote).toBe("a b c");
  });

  it("round-trips through a labeller's spreadsheet", () => {
    expect(readSheet(sheet)).toHaveLength(33);
    expect(readSheet(sheet)[0].itemId).toBe("QF1");
  });
});

describe("the agreement numbers", () => {
  const rows = readSheet(sheet);
  const label = (statuses: Record<string, string>) =>
    rows.map((row) => ({ ...row, humanStatus: statuses[row.itemId] ?? row.autoStatus }));

  it("scores precision and recall against the rows the labellers agreed on", () => {
    // Both labellers say QO6 did not happen; the check says it did. That is a false positive.
    const a = label({ QO6: "not_observed" });
    const b = label({ QO6: "not_observed" });
    const qo6 = agreement(a, b).find((row) => row.itemId === "QO6")!;
    expect(qo6.falsePositives).toBe(1);
    expect(qo6.precision).toBe(0);
    expect(qo6.recall).toBeNull();
  });

  it("reports perfect agreement when the check matches both labellers", () => {
    const qf2 = agreement(label({}), label({})).find((row) => row.itemId === "QF2")!;
    expect(qf2.falsePositives).toBe(0);
    expect(qf2.falseNegatives).toBe(0);
    expect(qf2.humanDisagreements).toBe(0);
  });

  it("counts a row the labellers disagreed on instead of scoring it", () => {
    const qo6 = agreement(label({ QO6: "observed" }), label({ QO6: "not_observed" })).find((row) => row.itemId === "QO6")!;
    expect(qo6.humanDisagreements).toBe(1);
    expect(qo6.truePositives + qo6.falsePositives + qo6.falseNegatives + qo6.trueNegatives).toBe(0);
  });

  it("ignores a row either labeller left blank", () => {
    const blank = rows.map((row) => ({ ...row, humanStatus: "" }));
    expect(agreement(blank, blank).every((row) => row.kappa === null)).toBe(true);
  });

  it("computes Cohen's kappa, and says nothing when there is nothing to measure", () => {
    expect(cohensKappa([true, false, true], [true, false, true])).toBe(1);
    expect(cohensKappa([true, true], [true, true])).toBeNull();
    expect(cohensKappa([], [])).toBeNull();
    expect(cohensKappa([true, false, true, false], [false, true, false, true])).toBeLessThan(0);
  });

  it("applies the thresholds from the validation plan", () => {
    const table = agreementReport(agreement(label({ QO6: "not_observed" }), label({ QO6: "not_observed" })));
    expect(table.split("\n")[0]).toContain("showToEngineers");
    const qo6 = table.split("\n").find((line) => line.startsWith("QO6"))!;
    // Precision 0 is far below the 0.80 needed to show an item in practice mode.
    expect(qo6).toContain("admin only");
  });
});
