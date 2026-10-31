import { useEffect, useState } from "react";
import type { SessionMode } from "@/review/types";
import { SESSION_TIME_CAP_MIN } from "../config";

/** How often the countdown redraws. */
const TICK_MS = 1000;

export const SESSION_CAP_MS = SESSION_TIME_CAP_MIN * 60_000;

type ClockInput = {
  mode: SessionMode;
  stage: "work" | "report";
  interviewEnd: unknown;
  awaitingIntake: boolean;
  workStartedAt: number;
};

/**
 * Whether a countdown should be shown, and whether the cap timer should be armed. These are
 * deliberately not the same test: the countdown only needs to run while there is something on
 * screen to count down, so it also waits for the work stage, but the cap itself must fire whether
 * or not the report is open.
 *
 * Kept as a plain function so the boundary arithmetic can be tested without a DOM — this repo's
 * render tests use renderToStaticMarkup, which never runs an effect or a timer.
 */
export function clockState({ mode, stage, interviewEnd, awaitingIntake, workStartedAt }: ClockInput) {
  const scored = mode !== "practice";
  const ended = Boolean(interviewEnd) || awaitingIntake;
  return {
    showsCountdown: scored && stage === "work" && !ended,
    armsCap: scored && !ended,
    capAt: workStartedAt + SESSION_CAP_MS,
  };
}

/** Milliseconds left on the cap, or null when this session has none. */
export function msLeftAt(input: ClockInput, now: number) {
  const { showsCountdown, capAt } = clockState(input);
  return showsCountdown ? Math.max(0, capAt - now) : null;
}

/**
 * The scored session's clock: the milliseconds left on the cap, and the timer that ends the
 * interview when it runs out. Practice mode has no cap, so this returns null and starts nothing.
 */
export function useSessionClock(input: ClockInput & { onTimeCap: () => void }) {
  const { onTimeCap, ...clock } = input;
  const [now, setNow] = useState(() => Date.now());
  const { showsCountdown, armsCap, capAt } = clockState(clock);

  useEffect(() => {
    if (!showsCountdown) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [showsCountdown]);

  useEffect(() => {
    if (!armsCap) return;
    const timer = setTimeout(onTimeCap, Math.max(0, capAt - Date.now()));
    return () => clearTimeout(timer);
  }, [armsCap, capAt, onTimeCap]);

  return msLeftAt(clock, now);
}
