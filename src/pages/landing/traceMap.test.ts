import { describe, expect, it } from "vitest";
import { BOXES, FACTS, REQUIREMENTS, chainOf, factStatus, summarize, traceGeometry } from "./traceMap";

const keys = new Set([
  ...FACTS.map((f) => `fact:${f.id}`),
  ...REQUIREMENTS.map((r) => `req:${r.id}`),
  ...BOXES.map((b) => `box:${b.id}`),
]);

describe("trace map", () => {
  it("counts three of four facts carried through and one dropped", () => {
    expect(summarize()).toEqual({ facts: 4, carried: 3, dropped: 1 });
  });

  it("derives status from the links, not a stored flag", () => {
    expect(factStatus({ id: "x", label: "x", requirement: null })).toBe("dropped");
    expect(factStatus({ id: "x", label: "x", requirement: "R3" })).toBe("carried_through");
    expect(summarize([{ id: "x", label: "x", requirement: null }])).toEqual({ facts: 1, carried: 0, dropped: 1 });
  });

  it("connects only items that exist", () => {
    const { links, stubs } = traceGeometry();
    for (const link of links) {
      expect(keys).toContain(link.from);
      expect(keys).toContain(link.to);
    }
    for (const stub of stubs) expect(keys).toContain(stub.from);
  });

  it("draws one link per fact-to-requirement and requirement-to-box edge", () => {
    const edges = FACTS.filter((f) => f.requirement).length + REQUIREMENTS.reduce((n, r) => n + r.boxes.length, 0);
    expect(traceGeometry().links).toHaveLength(edges);
  });

  it("gives the dropped fact a stub and no outgoing path", () => {
    const { links, stubs } = traceGeometry();
    expect(links.some((l) => l.from === "fact:walk-in")).toBe(false);
    expect(stubs.map((s) => s.from)).toEqual(["fact:walk-in"]);
  });

  it("follows a fact through its requirement to every box", () => {
    expect([...chainOf({ kind: "fact", id: "sticky-notes" })].sort()).toEqual(
      ["box:calendar", "box:staff-entry", "fact:sticky-notes", "req:R1"].sort(),
    );
    expect([...chainOf({ kind: "fact", id: "walk-in" })]).toEqual(["fact:walk-in"]);
  });

  it("follows a requirement back to its facts and on to its boxes", () => {
    expect([...chainOf({ kind: "requirement", id: "R2" })].sort()).toEqual(["box:calendar", "box:form", "fact:online", "req:R2"].sort());
  });

  it("keeps every path inside the 0-100 viewBox", () => {
    const numbers = traceGeometry()
      .links.flatMap((l) => l.d.match(/-?\d+(\.\d+)?/g)!)
      .map(Number);
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(100);
  });
});
