// The homepage's copy and its illustrative fixtures. Kept out of the components so a wording change
// does not mean reading JSX, and so the animated and static walkthroughs read the same story.

export const HERO = {
  title: "Make your engineering judgement clear.",
  body: "Practise turning an unclear client problem into well-reasoned engineering decisions. Explain your choices, weigh alternatives, and revise your design when the evidence challenges it.",
  caption: "Illustrative walkthrough · Community Room simulated case",
  support: [
    "Connect needs, requirements, decisions, and diagrams, so others can follow what you propose, why you chose it, and what still needs answering.",
    "For students and early-career engineers, with an ambition to share clearly reasoned designs back with NGOs.",
  ],
};

// The opening walkthrough. `at` is when each step begins, in ms of playback time.
export const HERO_STEPS = [
  { id: "opening", at: 0 },
  { id: "typing", at: 1_000 },
  { id: "reply", at: 3_000 },
  { id: "requirement", at: 5_000 },
  { id: "diagram", at: 7_000 },
  { id: "walkin", at: 10_000 },
  { id: "gap", at: 12_000 },
] as const;

export type HeroStepId = (typeof HERO_STEPS)[number]["id"];

export const HERO_OPENING = "Our rooms keep getting double-booked.";
export const HERO_WALKIN = "Some people just walk in to book.";
export const HERO_QUESTION = "How do phone bookings get recorded?";
export const HERO_REPLY = {
  before: "We put them on sticky notes. ",
  highlight: "Sometimes they don’t make it onto the calendar.",
};
export const HERO_REQUIREMENT = { id: "R1", text: "Staff can record phone bookings in the shared calendar." };
export const HERO_DIAGRAM = ["Staff booking entry", "Shared calendar", "Availability check"];
export const HERO_DIAGRAM_REASON = "Staff need to capture phone bookings where availability is checked.";
export const HERO_GAP = "Walk-in bookings were mentioned, but no requirement addresses them.";

export const HERO_SUMMARY =
  "Mei, the simulated client, says rooms keep getting double-booked and that some people walk in to book. The engineer asks how phone bookings are recorded and learns they go on sticky notes that sometimes miss the calendar. That evidence leads to requirement R1, which the diagram carries from staff booking entry through the shared calendar to an availability check. Feedback then points out that the walk-in need was heard but no requirement addresses it.";

// The shared decision behind R1. `source` separates what the client said from engineering reasoning.
export const DECISION: { label: string; text: string; source: "client" | "engineer" }[] = [
  { label: "Decision", text: "Staff record phone bookings in the shared calendar.", source: "engineer" },
  { label: "Evidence", text: "Phone bookings are recorded on sticky notes and sometimes miss the calendar.", source: "client" },
  { label: "Reason", text: "Record bookings where availability is checked, reducing reliance on a later transfer.", source: "engineer" },
  { label: "Alternative considered", text: "Keep the sticky notes and reconcile them at the end of the day.", source: "engineer" },
  { label: "Trade-off", text: "Staff must enter a booking during the call instead of leaving data entry until later.", source: "engineer" },
  { label: "Assumption to check", text: "Staff have access to the calendar while taking calls.", source: "engineer" },
  { label: "Open question", text: "Who handles phone bookings when the usual staff member is absent?", source: "engineer" },
];

export const PROCESS = {
  title: "One client. One problem. Your decisions.",
  quote: "“Our rooms keep getting double-booked.”",
  intro: "Meet Mei, who manages bookings at a community centre. Investigate what is going wrong and develop a design that fits how the centre works.",
  action: "Try the Community Room case",
  caption: "A working prototype featuring a simulated community centre scenario.",
};

export const PROCESS_STEPS = [
  {
    id: "explore",
    title: "Explore the problem",
    text: "Read the opening brief. Decide what you need to understand.",
  },
  {
    id: "interview",
    title: "Interview the client",
    text: "Ask the AI-simulated client about their work, users, and constraints. Follow up when something is unclear.",
  },
  {
    id: "develop",
    title: "Develop your design",
    text: "Commit to an approach. Explain the evidence, alternatives, trade-offs, and open questions behind your requirements, decisions, and diagram.",
  },
  {
    id: "review",
    title: "Review and revise",
    text: "Check what you missed, assumed, or left out. Test whether your reasoning holds up, and revise your design where it does not.",
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
  body: [
    "A proposed system is easier to assess when you can see which needs it addresses, why decisions were made, and what questions remain.",
    "Our aim is to share designs with that reasoning attached, giving your organisation a clearer basis for discussing options, challenging assumptions, and planning next steps.",
    "Bring a challenge you are still figuring out, from scattered records to bookings that clash. You do not need a technical brief.",
  ],
  sceneLabel: "Illustrative organisational challenge",
  sceneCaption: "What need? Why this decision? What remains open?",
  steps: [
    { title: "Share your situation", text: "Tell us what happens today, who is affected, and what is difficult. Start with what you know." },
    { title: "Shape a case together", text: "Explore how your challenge could become a realistic exercise, agreeing what information can be included and shared." },
    { title: "Understand the proposal", text: "Our aim is to share designs that explain the needs, decisions, trade-offs, and open questions, so you can assess possible directions." },
  ],
  action: "Talk to us about your challenge",
  note: "This collaboration pathway is being developed. Practice produces design proposals; implementation would require further review and a separate project.",
};

export const FEEDBACK = {
  title: "Make the reasoning something others can check.",
  label: "Illustrative feedback · Community Room case",
  quote: "“Some of them don’t have smartphones, so they call or just walk in.”",
  requirementLabel: "Example requirement",
  requirement: "Residents can submit room booking requests through an online form.",
  findingHeading: "Heard, but left out",
  finding: "You captured this in your interview, but your requirements only support online bookings.",
  promptHeading: "What to revisit",
  prompt: "How will staff record phone and walk-in bookings alongside online requests?",
  closing: "Follow a need into the design and inspect the reasoning behind each decision. See what supports the proposal, what was left out, and what still needs answering.",
};

export const AMBITION = {
  title: "Engineering judgement others can build on.",
  body: "design_it is a working prototype today. Our ambition is a free platform where engineers practise making better decisions by explaining and testing their reasoning, and share designs that help NGOs understand possible solutions.",
  ai: "AI can help implement a solution. A clear design makes the judgement guiding it visible.",
  caption: "Future collaboration model",
  centre: "Our ambition",
  returnLabel: "Discuss and refine",
  action: "Discuss a collaboration",
  stages: [
    {
      title: "Organisational challenge",
      audience: "For NGOs and problem owners",
      text: "Explore proposals with the needs, reasons, trade-offs, and open questions made clear.",
    },
    {
      title: "Engineering judgement made explicit",
      audience: "For students and early-career engineers",
      text: "Practise understanding clients, committing to decisions, explaining your reasoning, and revising your design when challenged.",
    },
    {
      title: "A design others can understand",
      audience: "For employers and educators",
      text: "Explore a structured way to develop, discuss, and review engineering judgement, including the decisions guiding work built with AI.",
    },
  ],
};

export const CLOSING = {
  title: "A clear design makes your judgement visible.",
  body: "Practise understanding the problem, explaining your decisions, and improving your design through evidence and feedback.",
  primary: "Try the Community Room case",
  invitation: "Have an NGO challenge engineers could learn from?",
  secondary: "Talk to us about your challenge",
};

export const CONTACT_UNAVAILABLE =
  "Contact is not open yet. We have not set up a way to reach us about this pathway, so there is no form or address here.";
