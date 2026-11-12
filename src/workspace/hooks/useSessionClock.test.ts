// The countdown is the only time guidance a scored interview gets, so its boundaries are worth pinning down.
import { describe, expect, it } from "vitest";
import { SESSION_CAP_MS, clockState, msLeftAt } from "./useSessionClock";

const base = {
  mode: "assessment" as const,
  stage: "work" as const,
  interviewEnd: null,
  awaitingIntake: false,
  workStartedAt: 1_000_000,
};

describe("the session clock", () => {
  it("gives practice mode no cap at all", () => {
    const practice = { ...base, mode: "practice" as const };
    expect(clockState(practice)).toMatchObject({ showsCountdown: false });
    expect(msLeftAt(practice, base.workStartedAt)).toBeNull();
  });

  it("counts down from the full cap and stops at zero, never below", () => {
    expect(msLeftAt(base, base.workStartedAt)).toBe(SESSION_CAP_MS);
    expect(msLeftAt(base, base.workStartedAt + 60_000)).toBe(SESSION_CAP_MS - 60_000);
    expect(msLeftAt(base, base.workStartedAt + SESSION_CAP_MS)).toBe(0);
    // Past the cap the number must not go negative, or the status bar would show a growing time.
    expect(msLeftAt(base, base.workStartedAt + SESSION_CAP_MS + 500_000)).toBe(0);
  });

  it("hides the countdown while the report is open", () => {
    const onReport = { ...base, stage: "report" as const };
    expect(clockState(onReport)).toMatchObject({ showsCountdown: false });
    expect(msLeftAt(onReport, base.workStartedAt)).toBeNull();
  });

  it("stops once the interview has ended or while the intake is still open", () => {
    for (const over of [{ interviewEnd: { at: 1 } }, { awaitingIntake: true }]) {
      expect(clockState({ ...base, ...over })).toMatchObject({ showsCountdown: false });
    }
  });

  it("measures the cap from the work start, not the session start", () => {
    // Research mode sets workStartedAt after the intake, so the intake cannot eat the cap.
    const afterIntake = { ...base, workStartedAt: base.workStartedAt + 300_000 };
    expect(clockState(afterIntake).capAt).toBe(base.workStartedAt + 300_000 + SESSION_CAP_MS);
  });
});
