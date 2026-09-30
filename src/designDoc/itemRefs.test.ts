import { describe, expect, it } from "vitest";
import { linkBareItemIds } from "./itemRefs";

describe("linkBareItemIds", () => {
  it("links bare mentions of requirements, assumptions and decisions", () => {
    expect(linkBareItemIds("staff need to be online to book (A2).")).toBe("staff need to be online to book ([A2](#A2)).");
    expect(linkBareItemIds("small SMS cost; depends on A1 and D3")).toBe(
      "small SMS cost; depends on [A1](#A1) and [D3](#D3)",
    );
  });

  it("leaves existing links and citation titles alone", () => {
    const text = 'because [R1](#R1), [R4](#R4) — [Chat #8](#chat-msg-8 "note (R2) never makes it")';
    expect(linkBareItemIds(text)).toBe(text);
  });

  it("does not touch words that only contain an id", () => {
    expect(linkBareItemIds("DR1 and R1x and #R1")).toBe("DR1 and R1x and #R1");
  });
});
