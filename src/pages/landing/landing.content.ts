// The homepage's copy and its illustrative fixtures. Kept out of the components so a wording change
// does not mean reading JSX.

export const HERO = {
  title: "Make your engineering judgement clear.",
  body: "Interview a simulated client, design a solution, and get feedback on your reasoning.",
  caption: "Community Room case",
};

export const HERO_WALKIN = "Some people just walk in to book.";
export const HERO_QUESTION = "How do phone bookings get recorded?";
export const HERO_REPLY = {
  before: "We put them on sticky notes. ",
  highlight: "Sometimes they don’t make it onto the calendar.",
};
export const HERO_REQUIREMENT = { id: "R1", text: "Staff can record phone bookings in the shared calendar." };
/** Notion's tag colours, mapped by meaning: blue is Mei and the interview, red a gap or a problem. */
export type Tone = "gray" | "yellow" | "green" | "blue" | "purple" | "red";
export type FlowNode = { id: string; label: string; detail: string };

// R1's booking flow. Edges run in array order; `detail` is what a visitor reads after selecting a node.
export const HERO_DIAGRAM: FlowNode[] = [
  {
    id: "entry",
    label: "Staff booking entry",
    detail: "Staff enter the phone booking during the call, so it never waits on a sticky note.",
  },
  {
    id: "calendar",
    label: "Shared calendar",
    detail: "The booking goes straight into the one calendar everyone checks, where the sticky notes kept going missing.",
  },
  {
    id: "check",
    label: "Availability check",
    detail: "The slot is checked while the caller is still on the line, before the room is promised to anyone.",
  },
];
export const HERO_GAP = "Walk-in bookings were mentioned, but no requirement addresses them.";

export const HERO_SUMMARY =
  "Mei, the simulated client, says some people walk in to book and that phone bookings go on sticky notes that sometimes miss the calendar. That evidence leads to requirement R1, a decision to enter phone bookings in the shared calendar during the call, and a diagram from staff booking entry through the shared calendar to an availability check, while feedback flags that no requirement addresses walk-ins.";

// The decision behind R1. `source` separates what the client said from the engineer's own reasoning.
export type DecisionRow = { id: "evidence" | "instead" | "tradeoff"; label: string; text: string; source: "client" | "engineer" };
export const DECISION: { headline: string; rows: DecisionRow[] } = {
  headline: "Enter phone bookings in the shared calendar during the call.",
  rows: [
    { id: "evidence", label: "Evidence", text: "Sticky notes sometimes miss the calendar.", source: "client" },
    { id: "instead", label: "Instead of", text: "Reconciling sticky notes each evening.", source: "engineer" },
    { id: "tradeoff", label: "Trade-off", text: "Staff type during the call, not later.", source: "engineer" },
  ],
};

export const PROCESS = {
  title: "One client. One problem. Your decisions.",
  quote: "“Our rooms keep getting double-booked.”",
  action: "Try the Community Room case",
};

export const PROCESS_STEPS = [
  {
    id: "explore",
    title: "Explore the problem",
    text: "Read the brief.",
  },
  {
    id: "interview",
    title: "Interview the client",
    text: "Question an AI client.",
  },
  {
    id: "develop",
    title: "Develop your design",
    text: "Write requirements and a diagram.",
  },
  {
    id: "review",
    title: "Review and revise",
    text: "Get feedback. Revise.",
  },
] as const;

export type ProcessStepId = (typeof PROCESS_STEPS)[number]["id"];

export const BRIEF = {
  heading: "Community Room booking",
  lines: [
    "Mei manages room bookings at a community centre.",
    "Rooms keep getting double-booked, and residents are frustrated.",
    "Find out what is going wrong, then propose a design that fits how the centre works.",
  ],
};

export const INTERVIEW_EXCERPT: { who: "You" | "Mei"; text: string }[] = [
  { who: "You", text: "Who makes bookings today, and how?" },
  { who: "Mei", text: "Most people use the form on our website. Some of them don’t have smartphones, so they call or just walk in." },
  { who: "You", text: "What happens to a phone booking after the call?" },
  { who: "Mei", text: "We put them on sticky notes. Sometimes they don’t make it onto the calendar." },
];

export const NGO = {
  label: "For NGOs",
  title: "Understand the thinking behind a proposed solution.",
  body: "Bring a real problem. Engineers practise on it, and you see designs with the reasoning attached.",
  sceneLabel: "Illustrative organisational challenge",
  steps: [
    { title: "Share your situation", text: "Tell us what happens today." },
    { title: "Shape a case together", text: "We shape it into a practice case." },
    { title: "Understand the proposal", text: "See designs with the reasons attached." },
  ],
  ctaTitle: "Have a challenge engineers could learn from?",
  ctaBody: "Tell us how your team works today. Practice designs, not delivered software.",
  action: "Talk to us about your challenge",
};

export const FEEDBACK = {
  title: "Make the reasoning something others can check.",
  lead: "Every review traces what the client said through to the design. Pick an area to see it.",
  quote: "“Some of them don’t have smartphones, so they call or just walk in.”",
  findingHeading: "Heard, but left out",
  finding: "You captured this in your interview, but your requirements only support online bookings.",
  promptHeading: "What to revisit",
  prompt: "How will staff record phone and walk-in bookings alongside online requests?",
};

export const AMBITION = {
  title: "Engineering judgement others can build on.",
  body: "A free platform where engineers practise judgement, and NGOs see designs they can question.",
  ai: "AI can help implement a solution. A clear design makes the judgement guiding it visible.",
  caption: "Future collaboration model",
  centre: "Our ambition",
  returnLabel: "Discuss and refine",
  action: "Discuss a collaboration",
  stages: [
    {
      title: "Organisational challenge",
      audience: "For NGOs and problem owners",
      text: "See the reasoning behind proposals.",
    },
    {
      title: "Engineering judgement made explicit",
      audience: "For students and early-career engineers",
      text: "Practise and explain decisions.",
    },
    {
      title: "A design others can understand",
      audience: "For employers and educators",
      text: "Review judgement, including AI-built work.",
    },
  ],
};

export const CLOSING = {
  title: "A clear design makes your judgement visible.",
  primary: "Try the Community Room case",
  invitation: "Have an NGO challenge engineers could learn from?",
  secondary: "Talk to us about your challenge",
};
