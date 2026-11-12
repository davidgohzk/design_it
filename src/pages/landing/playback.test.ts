import { describe, expect, it } from "vitest";
import { HERO_QUESTION } from "./landing.content";
import { END_MS, INITIAL_PLAYBACK, frameAt, isRunning, playbackReducer, reached, type PlaybackAction } from "./playback";

const run = (...actions: PlaybackAction[]) => actions.reduce(playbackReducer, INITIAL_PLAYBACK);
const tick = (dt: number): PlaybackAction => ({ type: "tick", dt });

describe("hero playback", () => {
  it("does not start until the demonstration enters the viewport", () => {
    expect(run(tick(5_000)).elapsed).toBe(0);
    expect(run({ type: "view", inView: true }, tick(500)).elapsed).toBe(500);
  });

  it("does not advance while paused, offscreen or in a hidden tab", () => {
    const visible = { type: "view", inView: true } as const;
    expect(run(visible, { type: "pause" }, tick(500)).elapsed).toBe(0);
    expect(run(visible, { type: "view", inView: false }, tick(500)).elapsed).toBe(0);
    expect(run(visible, { type: "tab", hidden: true }, tick(500)).elapsed).toBe(0);
  });

  it("keeps a deliberate pause when the demonstration returns to view", () => {
    const p = run(
      { type: "view", inView: true },
      { type: "pause" },
      { type: "view", inView: false },
      { type: "view", inView: true },
      { type: "tab", hidden: true },
      { type: "tab", hidden: false },
      tick(500),
    );
    expect(p.userPaused).toBe(true);
    expect(p.elapsed).toBe(0);
    expect(playbackReducer(p, { type: "resume" }).userPaused).toBe(false);
  });

  it("stops on the final state", () => {
    const p = run({ type: "view", inView: true }, tick(END_MS + 5_000));
    expect(p.elapsed).toBe(END_MS);
    expect(isRunning(p)).toBe(false);
    expect(frameAt(p.elapsed).step).toBe("gap");
  });

  it("replays from the start and clears a pause", () => {
    const p = run({ type: "view", inView: true }, tick(8_000), { type: "pause" }, { type: "replay" });
    expect(p.elapsed).toBe(0);
    expect(isRunning(p)).toBe(true);
  });

  it("types the one question once, then holds it", () => {
    expect(frameAt(999).typed).toBe(0);
    expect(frameAt(1_320).typed).toBe(10);
    expect(frameAt(2_999).typed).toBe(HERO_QUESTION.length);
    expect(frameAt(END_MS).typed).toBe(HERO_QUESTION.length);
  });

  it("reveals the story in order", () => {
    expect(frameAt(0).step).toBe("opening");
    expect(reached(frameAt(4_999), "requirement")).toBe(false);
    expect(reached(frameAt(5_000), "requirement")).toBe(true);
    expect(reached(frameAt(11_000), "gap")).toBe(false);
    expect(reached(frameAt(END_MS), "diagram")).toBe(true);
  });
});
