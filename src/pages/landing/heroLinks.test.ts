import { describe, expect, it } from "vitest";
import { HERO_LINKS, isHot, linkPath, type HeroFocus } from "./heroLinks";

const hotIds = (focus: HeroFocus | null) => HERO_LINKS.filter((l) => isHot(l, focus)).map((l) => l.id);

describe("hero connector paths", () => {
  it("runs from one pane's right edge to the next pane's left edge, arrowhead pointing in", () => {
    const { line, arrow } = linkPath({ x: 100, y: 40 }, "right", { x: 160, y: 80 }, "left");
    expect(line.startsWith("M100 40")).toBe(true);
    expect(line.endsWith("160 80")).toBe(true);
    expect(arrow).toBe("M152 74 L160 80 L152 86");
  });

  it("bows a same-side link outward instead of drawing it through the panes", () => {
    const { line } = linkPath({ x: 0, y: 20 }, "left", { x: 0, y: 300 }, "left");
    expect(line).toBe("M0 20 C-28 20 -28 300 0 300");
  });
});

describe("hero connector chain", () => {
  it("reads left to right: reply, R1, decision, diagram, with walk-ins pointing at the feedback", () => {
    const pairs = HERO_LINKS.map((l) => [l.from, l.to]);
    expect(pairs).toEqual([
      [".lp-mark", ".lp-req"],
      [".lp-req", ".lp-decision-head"],
      [".lp-decision-head", ".lp-fd-btn"],
      [".lp-msg.is-flagged", ".lp-finding"],
    ]);
  });

  it("lights the whole trace from Mei's reply to the diagram when R1 is the focus", () => {
    expect(hotIds("requirement")).toEqual(["reply", "requirement", "decision"]);
  });

  it("lights only the decision's own arrows when the decision is the focus", () => {
    expect(hotIds("decision")).toEqual(["requirement", "decision"]);
  });

  it("never lights the walk-in gap, and nothing is lit without a focus", () => {
    expect(hotIds("reply")).toEqual(["reply"]);
    expect(hotIds(null)).toEqual([]);
  });
});
