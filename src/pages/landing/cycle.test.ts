import { describe, expect, it } from "vitest";
import { RING_LOOP, ringArc, ringPoint, stageLink, stagePosition } from "./cycle";

describe("ambition cycle geometry", () => {
  it("places stage 1 at the top of the ring and the others below it on either side", () => {
    expect(stagePosition(0)).toEqual({ "--x": "50%", "--y": "17.6%" });
    const right = parseFloat(stagePosition(1)["--x"]);
    const left = parseFloat(stagePosition(2)["--x"]);
    expect(right).toBeGreaterThan(50);
    expect(left).toBeCloseTo(100 - right, 1);
  });

  it("links each stage to the next one clockwise, closing the loop", () => {
    expect(stageLink(0).d).toBe(ringArc(-90, 30));
    expect(stageLink(2).d.endsWith(`${ringPoint(-90).x} ${ringPoint(-90).y}`)).toBe(true);
    expect(stageLink(1).d).toContain(" 0 0 1 ");
  });

  it("closes the travelling dot's loop where it starts", () => {
    const start = ringPoint(-90);
    expect(RING_LOOP.startsWith(`M${start.x} ${start.y}`)).toBe(true);
    expect(RING_LOOP.endsWith(`${start.x} ${start.y}`)).toBe(true);
  });
});
