import { completeIntake } from "../../../assessment/intake";
import type { Intake } from "../../../assessment/intake";

const STORAGE_KEY = "design_it.intake";

/** The intake saved earlier in this browser session so a later demo session does not ask again. */
export function storedIntake(): Intake | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    return value ? completeIntake(value) : null;
  } catch {
    return null;
  }
}

export function saveIntake(intake: Intake) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intake));
  } catch {
    // Storage can be blocked; the intake still goes into this session's export.
  }
}
