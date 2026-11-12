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
 * Whether a countdown should be shown. Running out of time does not end the interview: the
 * countdown is guidance only.
 *
 * Kept as a plain function so the boundary arithmetic can be tested without a DOM — this repo's
 * render tests use renderToStaticMarkup, which never runs an effect or a timer.
 */
export function clockState({ mode, stage, interviewEnd, awaitingIntake, workStartedAt }: ClockInput) {
  const scored = mode !== "practice";
  const ended = Boolean(interviewEnd) || awaitingIntake;
  return {
    showsCountdown: scored && stage === "work" && !ended,
    capAt: workStartedAt + SESSION_CAP_MS,
  };
}

/** Milliseconds left on the cap, or null when this session has none. */
export function msLeftAt(input: ClockInput, now: number) {
  const { showsCountdown, capAt } = clockState(input);
  return showsCountdown ? Math.max(0, capAt - now) : null;
}

/**
 * The scored session's clock: the milliseconds left on the cap. Practice mode has no cap, so this
 * returns null and starts nothing.
 */
export function useSessionClock(clock: ClockInput) {
  const [now, setNow] = useState(() => Date.now());
  const { showsCountdown } = clockState(clock);

  useEffect(() => {
    if (!showsCountdown) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [showsCountdown]);

  return msLeftAt(clock, now);
}
