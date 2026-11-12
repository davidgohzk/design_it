// The landing page's copy. Kept out of the components so a wording change does not mean reading
// JSX, and so each section file is only markup.

export const STATS = [
  {
    fact: "Copilot users finished a task",
    number: "55.8% faster",
    source: "Peng et al., 2023",
    url: "https://arxiv.org/abs/2302.06590",
  },
  {
    fact: "AI users felt faster, but were",
    number: "19% slower",
    source: "METR, 2025",
    url: "https://arxiv.org/abs/2507.09089",
  },
  {
    fact: "AI-written code had a security flaw in",
    number: "45% of tests",
    source: "Veracode, 2025",
    url: "https://www.businesswire.com/news/home/20250730694951/en/",
  },
];

// The build loop: AI owns one step, the human owns the rest.
export const BUILD_LOOP = [
  { who: "You", icon: "interview", label: "Decide what to build" },
  { who: "You", icon: "brief", label: "Design it clearly" },
  { who: "AI", icon: "agent", label: "Write the code" },
  { who: "You", icon: "check", label: "Check the result" },
] as const;

export const PRACTICE_TODAY = [
  {
    kind: "Algorithm puzzles",
    title: "Short coding problems with one right answer",
    text: "They drill the part of the job AI now does best.",
  },
  {
    kind: "System design mock interviews",
    title: "A practice interview on a ready-made prompt",
    text: "The prompt arrives already specified. Someone has done the hard part for you.",
  },
  {
    kind: "AI mock interviewers",
    title: "An AI interviewer, available any time",
    text: "But the interviewer knows the answer. A real client doesn't.",
  },
];

export const DIFFERENCES = [
  "You start from a messy client, not a clean prompt.",
  "You practise any time, without booking a senior engineer.",
  "You do the whole task: interview, design doc, diagram.",
  "Every decision stays linked to the evidence behind it.",
  "Your feedback is checked against what the client actually knew.",
];

export const FUNNEL_STAGES: { label: string; leaks: { state: string; text: string }[] }[] = [
  {
    label: "Found in the interview",
    leaks: [
      { state: "missed", text: "Missed: never asked" },
      { state: "assumed", text: "Assumed: wrote it without asking" },
    ],
  },
  {
    label: "Written into a requirement",
    leaks: [{ state: "dropped", text: "Dropped: heard it, never used it" }],
  },
  { label: "Used in a decision", leaks: [] },
  { label: "Drawn in the diagram", leaks: [] },
];

export const FUTURE = [
  {
    kicker: "Problem library",
    title: "Real problems from NGOs and organisations",
    text: "A growing library of cases, each built from a problem someone actually has.",
  },
  {
    kicker: "Free practice",
    title: "Free design practice, for everyone",
    text: "A free platform where engineers practise the whole design task, as often as they like.",
  },
  {
    kicker: "Social enterprise",
    title: "Run for impact",
    text: "Free for engineers, with the work flowing back to the organisations that need it.",
  },
];

/** The sidebar's entries. Each `id` is the id of the matching <section>, so the two cannot drift. */
export const NAV_SECTIONS = [
  { id: "is-hero", label: "Home" },
  { id: "is-current", label: "The shift" },
  { id: "is-skill", label: "The skill" },
  { id: "is-practice", label: "Practice today" },
  { id: "is-how", label: "How it works" },
  { id: "is-feedback", label: "Your feedback" },
  { id: "is-who-wins", label: "Who wins" },
  { id: "is-prototype", label: "Try it" },
  { id: "is-future", label: "Where it's going" },
];
