// The interview-mistake checklist, as data. No logic lives here.
//
// It follows the reviewer checklist in Appendix A of Bano, M., Zowghi, D., Ferrari, A., Spoletini, P.
// and Donati, B. (2019), "Teaching requirements elicitation interviews: an empirical study of learning
// from mistakes", Requirements Engineering journal — 33 mistakes in 7 themes, observed in student
// elicitation interviews. https://par.nsf.gov/servlets/purl/10105611
//
// Every wording below is ours. The paper's sentences are not copied into the code, the UI or the
// prompts; the paper is cited in the panel's "About this check" instead.
//
// Teaching only: never scored, never summed into a total, and not one of the five levels.
import type { Level } from "@/review/types";

export type BanoTheme =
  | "question_formulation"
  | "question_omission"
  | "interview_order"
  | "communication"
  | "analyst_behaviour"
  | "customer_interaction"
  | "teamwork_planning";

/** How an item is decided. `see_ask` defers to a level; `not_applicable` can't be read from a text chat. */
export type BanoSource = "code" | "ai" | "see_ask" | "not_applicable";

/** One worked example per case id. */
export type BanoExamples = Record<string, string>;

export type BanoItemSpec = {
  /** "QF2". */
  id: string;
  theme: BanoTheme;
  /** The mistake, in our words. */
  mistake: string;
  source: BanoSource;
  /** AB1-AB4: tone and attitude are hard to read from text, so these are held back by default. */
  weak?: boolean;
  /** TP5 only: reported for interest, never as a mistake. */
  infoOnly?: boolean;
  /** One line of advice, practice mode only. */
  tip?: string;
  /** `see_ask` items: the level that already measures this. */
  seeAsk?: { level: Level; why: string };
  /** `not_applicable` items: the short name of what a solo text chat can't show. */
  notApplicable?: string;
  /**
   * `ai` items: what the judge is told. The examples are per case and are DRAFTS - review before
   * publishing. They are written by us, never taken from the paper.
   */
  ai?: { definition: string; mistakeExample: BanoExamples; goodExample: BanoExamples };
};

export const BANO_THEMES: readonly BanoTheme[] = [
  "question_formulation",
  "question_omission",
  "interview_order",
  "communication",
  "analyst_behaviour",
  "customer_interaction",
  "teamwork_planning",
];

export const BANO_THEME_LABEL: Record<BanoTheme, string> = {
  question_formulation: "Question formulation",
  question_omission: "Question omission",
  interview_order: "Interview order",
  communication: "Communication",
  analyst_behaviour: "Analyst behaviour",
  customer_interaction: "Customer interaction",
  teamwork_planning: "Teamwork and planning",
};

const ASK: BanoItemSpec["seeAsk"] = { level: "ask", why: "Measured by the Ask check" };

export const BANO_CHECKLIST: readonly BanoItemSpec[] = [
  // Question formulation
  {
    id: "QF1",
    theme: "question_formulation",
    mistake: "Asks vague questions that could mean many things",
    source: "ai",
    tip: "Ask about one concrete thing: a room, a shift, a step in the booking.",
    ai: {
      definition: "The question is so broad or unspecific that the client could answer it in several unrelated ways.",
      mistakeExample: {
        "community-room": "Can you tell me about the centre?",
      },
      goodExample: {
        "community-room": "What happens between someone phoning up and the booking reaching the book?",
      },
    },
  },
  {
    id: "QF2",
    theme: "question_formulation",
    mistake: "Asks technical questions the client can't answer",
    source: "code",
    tip: "Ask about the work, not the technology. The client knows the desk, not the database.",
  },
  {
    id: "QF3",
    theme: "question_formulation",
    mistake: "Asks questions that don't matter for this problem",
    source: "ai",
    tip: "Before asking, check that the answer could change your design.",
    ai: {
      definition: "The question is clear but its answer could not change the design of the thing being built.",
      mistakeExample: {
        "community-room": "How long has the community centre been open?",
      },
      goodExample: {
        "community-room": "How many bookings do you take in a normal week?",
      },
    },
  },
  {
    id: "QF4",
    theme: "question_formulation",
    mistake: "Asks the client to design the solution",
    source: "code",
    tip: "The client is the expert on the problem; the design is yours to choose.",
  },
  {
    id: "QF5",
    theme: "question_formulation",
    mistake: "Asks long or overloaded questions",
    source: "code",
    tip: "One question per message. The client answers the last one and forgets the rest.",
  },
  {
    id: "QF6",
    theme: "question_formulation",
    mistake: "Words questions in a confusing or wrong way",
    source: "ai",
    tip: "Read the question back to yourself before you send it.",
    ai: {
      definition: "The question is garbled, self-contradictory, or asks something other than what was clearly meant.",
      mistakeExample: {
        "community-room": "So the book doesn't not get the phone ones, or does the desk?",
      },
      goodExample: {
        "community-room": "When someone phones, where does that booking get written down?",
      },
    },
  },

  // Question omission
  {
    id: "QO1",
    theme: "question_omission",
    mistake: "Never asks who else is involved or affected",
    source: "code",
    tip: "Ask who else touches this work. The people you miss are the requirements you miss.",
  },
  {
    id: "QO2",
    theme: "question_omission",
    mistake: "Rarely or never follows up on an answer",
    source: "code",
    tip: "When an answer is interesting, ask why before you move on.",
  },
  {
    id: "QO3",
    theme: "question_omission",
    mistake: "Never asks how things work today",
    source: "code",
    tip: "Walk through the current way end to end before you change it.",
  },
  {
    id: "QO4",
    theme: "question_omission",
    mistake: "Never asks what matters most",
    source: "code",
    tip: "Ask what they would fix first if they could only fix one thing.",
  },
  {
    id: "QO5",
    theme: "question_omission",
    mistake: "Never explores the client's domain",
    source: "see_ask",
    seeAsk: ASK,
  },
  {
    id: "QO6",
    theme: "question_omission",
    mistake: "Never asks about goals or what success looks like",
    source: "code",
    tip: "Ask what a good outcome looks like before you discuss solutions.",
  },
  {
    id: "QO7",
    theme: "question_omission",
    mistake: "Misses relevant questions overall",
    source: "see_ask",
    seeAsk: ASK,
  },

  // Interview order
  {
    id: "IO1",
    theme: "interview_order",
    mistake: "Ends without summarising back",
    source: "code",
    tip: "End by playing back what you heard, so the client can correct you.",
  },
  {
    id: "IO2",
    theme: "interview_order",
    mistake: "Opens straight with system or feature questions",
    source: "code",
    tip: "Open with the problem and the people. Features come after you understand both.",
  },
  {
    id: "IO3",
    theme: "interview_order",
    mistake: "Jumps around with no clear order",
    source: "ai",
    tip: "Finish one topic before you start the next.",
    ai: {
      definition: "Consecutive questions hop between unrelated topics and return to earlier ones, with no visible thread.",
      mistakeExample: {
        "community-room": "How many rooms are there? Then: who answers the phone? Then: how many rooms did you say?",
      },
      goodExample: {
        "community-room": "How many rooms are there? Then: how many bookings a week? Then: busier in the holidays?",
      },
    },
  },
  {
    id: "IO4",
    theme: "interview_order",
    mistake: "Asks the same question twice",
    source: "code",
    tip: "Keep notes as you go, so you don't spend a question on an answer you already have.",
  },

  // Communication
  {
    id: "CS1",
    theme: "communication",
    mistake: "Sounds scripted rather than conversational",
    source: "ai",
    tip: "Respond to what the client actually said, not to your next planned question.",
    ai: {
      definition: "The questions read as a prepared list delivered in order, with no reaction to the client's answers.",
      mistakeExample: {
        "community-room": "Question three: how many rooms are there?",
      },
      goodExample: {
        "community-room": "Three rooms and one book - so does the dance studio clash with the hall most?",
      },
    },
  },
  {
    id: "CS2",
    theme: "communication",
    mistake: "Communicates unclearly overall",
    source: "ai",
    tip: "Short sentences, plain words, one idea at a time.",
    ai: {
      definition: "Across the interview the engineer is hard to follow: rambling, incomplete or disjointed messages.",
      mistakeExample: {
        "community-room": "So about the thing with the booking and also the desk, I mean how does that, with the people?",
      },
      goodExample: {
        "community-room": "Who writes a booking down when the phone rings?",
      },
    },
  },
  {
    id: "CS3",
    theme: "communication",
    mistake: "Doesn't listen: asks about something already answered",
    source: "code",
    tip: "Read the answer before you write the next question.",
  },
  {
    id: "CS4",
    theme: "communication",
    mistake: "Speaks quietly or unclearly",
    source: "not_applicable",
    notApplicable: "tone of voice",
  },

  // Analyst behaviour
  {
    id: "AB1",
    theme: "analyst_behaviour",
    mistake: "Lacks confidence",
    source: "ai",
    weak: true,
    tip: "Ask the question directly. You don't need to apologise for asking.",
    ai: {
      definition: "The engineer hedges, apologises for asking, or asks permission before each question.",
      mistakeExample: {
        "community-room": "Sorry, this is probably a silly question, but maybe could I ask about the book?",
      },
      goodExample: {
        "community-room": "How does a booking get into the book?",
      },
    },
  },
  {
    id: "AB2",
    theme: "analyst_behaviour",
    mistake: "Comes across as overconfident",
    source: "ai",
    weak: true,
    tip: "Ask what is true here rather than telling the client what their problem is.",
    ai: {
      definition: "The engineer asserts what the client needs, or claims to know the answer already, instead of asking.",
      mistakeExample: {
        "community-room": "I've seen this before - the paper book is the whole problem and you need it gone.",
      },
      goodExample: {
        "community-room": "What part of the paper book causes you the most trouble?",
      },
    },
  },
  {
    id: "AB3",
    theme: "analyst_behaviour",
    mistake: "Is passive and lets the client drive",
    source: "ai",
    weak: true,
    tip: "You run the interview. Pick the next topic rather than waiting to be told.",
    ai: {
      definition: "The engineer asks the client what to discuss, or only echoes them, instead of directing the interview.",
      mistakeExample: {
        "community-room": "What would you like to tell me about next?",
      },
      goodExample: {
        "community-room": "Let's stay on the phone bookings. What happens to the note after you write it?",
      },
    },
  },
  {
    id: "AB4",
    theme: "analyst_behaviour",
    mistake: "Behaves unprofessionally",
    source: "ai",
    weak: true,
    tip: "Keep it courteous, whatever the answers are like.",
    ai: {
      definition: "The engineer is rude, dismissive or flippant about the client, their staff or their work.",
      mistakeExample: {
        "community-room": "A paper book in this day and age? That's a bit hopeless.",
      },
      goodExample: {
        "community-room": "The book has clearly done the job for a while. Where does it start to break down?",
      },
    },
  },

  // Customer interaction
  {
    id: "CI1",
    theme: "customer_interaction",
    mistake: "Doesn't build rapport at the start",
    source: "code",
    tip: "Start with a greeting and a sentence on why you're here.",
  },
  {
    id: "CI2",
    theme: "customer_interaction",
    mistake: "Steers the client towards an answer",
    source: "code",
    tip: "Ask an open question instead of offering the answer you expect.",
  },
  {
    id: "CI3",
    theme: "customer_interaction",
    mistake: "Interrupts the client",
    source: "not_applicable",
    notApplicable: "interrupting",
  },

  // Teamwork and planning
  {
    id: "TP1",
    theme: "teamwork_planning",
    mistake: "Team is badly coordinated",
    source: "not_applicable",
    notApplicable: "team coordination",
  },
  {
    id: "TP2",
    theme: "teamwork_planning",
    mistake: "Manages time badly",
    source: "code",
    tip: "Get to the problem in your first few questions; the clock runs out faster than you think.",
  },
  {
    id: "TP3",
    theme: "teamwork_planning",
    mistake: "Shows no preparation: asks what the brief already said",
    source: "code",
    tip: "Read the brief first, then spend your questions on what it doesn't say.",
  },
  {
    id: "TP4",
    theme: "teamwork_planning",
    mistake: "Shows no plan for the interview",
    source: "ai",
    tip: "Decide your three topics before you start.",
    ai: {
      definition: "The interview shows no intended coverage: no topics worked through, no sense of what it set out to learn.",
      mistakeExample: {
        "community-room": "Hi. Erm. So what should I ask you about?",
      },
      goodExample: {
        "community-room": "I'd like to cover three things: how booking works now, who books, and what goes wrong.",
      },
    },
  },
  {
    id: "TP5",
    theme: "teamwork_planning",
    mistake: "Leaves long pauses",
    source: "code",
    infoOnly: true,
  },
];

export const BANO_ITEM = new Map(BANO_CHECKLIST.map((item) => [item.id, item]));

/** The items the AI task judges, in checklist order. */
export const BANO_AI_IDS: readonly string[] = BANO_CHECKLIST.filter((item) => item.source === "ai").map((item) => item.id);

/** The items a code rule decides, in checklist order. */
export const BANO_CODE_IDS: readonly string[] = BANO_CHECKLIST.filter((item) => item.source === "code").map((item) => item.id);

/** Recorded on every report, so a stored result says which checklist produced it. */
export const BANO_CHECKLIST_VERSION = "bano2019-appA-v1";
