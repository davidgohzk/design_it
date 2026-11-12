import { useEffect, useReducer, useSyncExternalStore, type RefObject } from "react";
import { END_MS, INITIAL_PLAYBACK, frameAt, isDone, isRunning, playbackReducer } from "./playback";

const REDUCED = "(prefers-reduced-motion: reduce)";

const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** Tracks the OS setting live, so switching it mid-visit takes effect without a reload. */
export const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);

export const prefersReducedMotion = () => window.matchMedia(REDUCED).matches;

/** Drives the opening walkthrough. Reduced motion renders the final frame and never ticks. */
export function useHeroPlayback(stage: RefObject<HTMLElement | null>) {
  const [playback, dispatch] = useReducer(playbackReducer, INITIAL_PLAYBACK);
  const reduced = useReducedMotion();
  const running = isRunning(playback) && !reduced;

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => dispatch({ type: "view", inView: entry.isIntersecting }), {
      threshold: 0.25,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    const onVisibility = () => dispatch({ type: "tab", hidden: document.hidden });
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let id = requestAnimationFrame(function loop(now) {
      // Capped so a dropped frame cannot skip a whole step.
      dispatch({ type: "tick", dt: Math.min(now - last, 100) });
      last = now;
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [running]);

  return {
    frame: frameAt(reduced ? END_MS : playback.elapsed),
    reduced,
    started: playback.started,
    done: reduced || isDone(playback),
    paused: playback.userPaused,
    dispatch,
  };
}

/** Sets `data-traced` once the element is mostly in view, which starts a one-shot CSS trace. */
export function useTraceOnce(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.traced = "";
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}
