// The opening walkthrough's clock. Pure, so the transitions are tested without a DOM.
//
// Three independent reasons stop the clock: the visitor paused it, it is offscreen, or the tab is
// hidden. Keeping them as separate flags is what stops a return to the viewport from overriding a
// deliberate pause.

import { HERO_STEPS, HERO_QUESTION, type HeroStepId } from "./landing.content";

export const TYPE_MS_PER_CHAR = 32;
export const END_MS = 15_000;

export type Playback = {
  elapsed: number;
  started: boolean;
  userPaused: boolean;
  inView: boolean;
  tabHidden: boolean;
};

export type PlaybackAction =
  | { type: "tick"; dt: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "replay" }
  | { type: "view"; inView: boolean }
  | { type: "tab"; hidden: boolean };

export const INITIAL_PLAYBACK: Playback = {
  elapsed: 0,
  started: false,
  userPaused: false,
  inView: false,
  tabHidden: false,
};

export const isDone = (p: Playback) => p.elapsed >= END_MS;

export const isRunning = (p: Playback) =>
  p.started && !p.userPaused && p.inView && !p.tabHidden && !isDone(p);

export function playbackReducer(p: Playback, action: PlaybackAction): Playback {
  switch (action.type) {
    case "tick":
      return isRunning(p) ? { ...p, elapsed: Math.min(END_MS, p.elapsed + action.dt) } : p;
    case "pause":
      return { ...p, userPaused: true };
    case "resume":
      return { ...p, userPaused: false };
    case "replay":
      return { ...p, elapsed: 0, started: true, userPaused: false };
    case "view":
      return { ...p, inView: action.inView, started: p.started || action.inView };
    case "tab":
      return { ...p, tabHidden: action.hidden };
  }
}

export type Frame = { step: HeroStepId; typed: number };

const stepIndex = (id: HeroStepId) => HERO_STEPS.findIndex((s) => s.id === id);

/** Whether the walkthrough has reached `id` in this frame. */
export const reached = (frame: Frame, id: HeroStepId) => stepIndex(frame.step) >= stepIndex(id);

export function frameAt(elapsed: number): Frame {
  const step = HERO_STEPS.findLast((s) => s.at <= elapsed) ?? HERO_STEPS[0];
  const typingStart = HERO_STEPS[stepIndex("typing")].at;
  const typed = Math.floor((elapsed - typingStart) / TYPE_MS_PER_CHAR);
  return { step: step.id, typed: Math.max(0, Math.min(HERO_QUESTION.length, typed)) };
}
