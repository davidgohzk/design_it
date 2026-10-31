// Research mode intake (WP12): asked once, before the warm-up, and exported with the session.

export type Frequency = "never" | "monthly" | "weekly" | "daily";

export type Intake = {
  /** Years of full-time software work. */
  yearsFullTime: number;
  /** Real client or stakeholder interviews run. */
  clientInterviews: "0" | "1-5" | "6-20" | "20+";
  requirementsWork: boolean;
  requirementsYears: number;
  /** Prior system design interviews (count). */
  systemDesignInterviews: number;
  aiForCoding: Frequency;
  githubPullRequests: Frequency;
  vsCode: Frequency;
  /** Familiarity with community centres or booking desks, 1 (none) to 5 (very). */
  bookingFamiliarity: 1 | 2 | 3 | 4 | 5;
};

export const FREQUENCIES: readonly Frequency[] = ["never", "monthly", "weekly", "daily"];
export const INTERVIEW_BANDS: readonly Intake["clientInterviews"][] = ["0", "1-5", "6-20", "20+"];

/** The intake is required in research mode only. */
export const intakeRequired = (mode: string) => mode === "research";

const wholeNumber = (value: unknown, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;

/** What is missing or wrong in a filled-in intake (empty when it can be saved). */
export function intakeProblems(form: Partial<Intake>): string[] {
  const problems: string[] = [];
  if (!wholeNumber(form.yearsFullTime, 60)) problems.push("Years of full-time software work (a whole number, 0 if none).");
  if (!INTERVIEW_BANDS.includes(form.clientInterviews as Intake["clientInterviews"])) problems.push("How many client or stakeholder interviews you've run.");
  if (typeof form.requirementsWork !== "boolean") problems.push("Whether you've done requirements work.");
  if (form.requirementsWork && !wholeNumber(form.requirementsYears, 60)) problems.push("Years of requirements work.");
  if (!wholeNumber(form.systemDesignInterviews, 500)) problems.push("How many system design interviews you've done (0 if none).");
  for (const [key, label] of [
    ["aiForCoding", "How often you use AI for coding."],
    ["githubPullRequests", "How often you use GitHub pull requests."],
    ["vsCode", "How often you use VS Code."],
  ] as const) {
    if (!FREQUENCIES.includes(form[key] as Frequency)) problems.push(label);
  }
  if (![1, 2, 3, 4, 5].includes(form.bookingFamiliarity as number)) problems.push("Your familiarity with community centres or booking desks (1 to 5).");
  return problems;
}

/** The intake as saved: requirementsYears is 0 when there was no requirements work. */
export function completeIntake(form: Partial<Intake>): Intake | null {
  if (intakeProblems(form).length) return null;
  return { ...(form as Intake), requirementsYears: form.requirementsWork ? (form.requirementsYears as number) : 0 };
}
