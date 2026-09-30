// What /simple opens with in practice mode, like /demo's seeded chat and review: the golden
// interview (spec §3.7), the model answer (§3.8) and a review of it. The review goes through the
// same verification as a live one, so every quote in it is checked against the transcript.
import { computeLinks } from "../assessment/links";
import { cuePrefilter, foundFromEvidence } from "../assessment/run";
import type { AssessmentResult } from "../assessment/types";
import { validateExpectedDecisions, validateFactEvidence, validateRatings } from "../assessment/validate";
import { checkConsistency, usableSketches } from "../designDoc/consistency";
import { parseDesignDoc } from "../designDoc/parse";
import type { ChatMessage } from "../types";
import { COMMUNITY_ROOM_CASE as CASE } from "./community-room";

const messages: ChatMessage[] = [
  { role: "assistant", content: CASE.openingMessage },
  { role: "user", content: "Hi Mei! What happens today when someone wants to book a room?" },
  {
    role: "assistant",
    content:
      "They come to the front desk or call us, and we write it in the booking book. It's just a big paper book that stays at the desk. The trouble is we keep getting double bookings - two groups turn up for the same room at the same time, and someone always goes home upset.",
  },
  { role: "user", content: "How many rooms do you have, and how many bookings do you get?" },
  {
    role: "assistant",
    content:
      "Three rooms - the activity hall, the meeting room and the dance studio. We get about 30 bookings a week, more during the school holidays.",
  },
  { role: "user", content: "Who usually makes the bookings?" },
  {
    role: "assistant",
    content:
      "Mostly residents' groups - the seniors' exercise group, the tuition teachers, a few family events. Many of our regulars are elderly, and some of them don't have smartphones, so they call or just walk in.",
  },
  { role: "user", content: "Why do you think the double bookings happen?" },
  {
    role: "assistant",
    content:
      "Hmm, I suppose it's usually the phone bookings. Whoever answers writes it on a sticky note because the book isn't always in front of them, and sometimes the note never makes it into the book.",
  },
  { role: "user", content: "Who works at the desk?" },
  {
    role: "assistant",
    content:
      "Just me and one other staff member, on alternating shifts, and volunteers on weekends. We share the one computer at the desk.",
  },
];

const docMarkdown = CASE.modelAnswerMarkdown;
const finalCode = CASE.modelAnswerFinalDiagram;

const asked = (messageIndex: number) => ({ messageIndex, quote: messages[messageIndex].content });

/** Levels 0 + 1A, in the shape /api/assess returns. */
const EVIDENCE = [
  {
    factId: "cr.scale",
    surfaced: { messageIndex: 4, quote: "We get about 30 bookings a week" },
    askedInArea: asked(3),
    docAssertion: null,
  },
  {
    factId: "cr.bookers",
    surfaced: { messageIndex: 6, quote: "some of them don't have smartphones, so they call or just walk in" },
    askedInArea: asked(5),
    docAssertion: null,
  },
  {
    factId: "cr.root-cause",
    surfaced: {
      messageIndex: 8,
      quote:
        "Whoever answers writes it on a sticky note because the book isn't always in front of them, and sometimes the note never makes it into the book.",
    },
    askedInArea: asked(7),
    docAssertion: null,
  },
  {
    factId: "cr.staff",
    surfaced: {
      messageIndex: 10,
      quote:
        "Just me and one other staff member, on alternating shifts, and volunteers on weekends. We share the one computer at the desk.",
    },
    askedInArea: asked(9),
    docAssertion: null,
  },
];

/** Level 3, in the shape /api/assess returns. */
const SOUNDNESS = {
  requirements: [
    { id: "R1", rating: "sound", reason: "Restates the brief's problem without adding to it." },
    { id: "R2", rating: "sound", reason: "Matches the quote; the school-holiday peak could also be noted." },
    { id: "R3", rating: "sound", reason: "Faithful to the quote about bookers without smartphones." },
    { id: "R4", rating: "sound", reason: "Captures the real cause: phone bookings bypass the book." },
    { id: "R5", rating: "sound", reason: "Faithful: two staff on shifts sharing one computer." },
  ],
  decisions: [
    { id: "D1", rating: "sound", reason: "One record removes the gap where sticky notes get lost (R4)." },
    { id: "D2", rating: "sound", reason: "Entering bookings during the call closes the phone-booking gap for staff on one computer." },
    { id: "D3", rating: "sound", reason: "Blocking taken slots directly prevents the double bookings in R1." },
    { id: "D4", rating: "sound", reason: "SMS reaches bookers without smartphones; the dependency on A1 is stated." },
    { id: "D5", rating: "sound", reason: "A hosted calendar is right-sized for about 30 bookings a week." },
  ],
  sketches: [
    { id: "D1", rating: "sound", reason: "Shows only the shared calendar the decision introduces." },
    { id: "D2", rating: "sound", reason: "Shows the resident, staff, desk computer and calendar the decision names." },
    { id: "D3", rating: "sound", reason: "Shows the request and the refusal of a taken slot." },
    { id: "D4", rating: "sound", reason: "Shows the confirmation going from the calendar to the resident by SMS." },
    { id: "D5", rating: "sound", reason: "A single hosted calendar box; nothing extra is drawn." },
  ],
  expectedDecisions: [
    { id: "ed.single-source", rating: "well", decisionIds: ["D1"], reason: "D1 retires the paper book and sticky notes for one shared calendar." },
    { id: "ed.phone-walkin", rating: "well", decisionIds: ["D2"], reason: "D2 has staff enter bookings while the booker is still on the phone or at the desk." },
    { id: "ed.no-smartphone", rating: "well", decisionIds: ["D4"], reason: "D4 confirms by SMS, which works on basic phones." },
    { id: "ed.conflicts", rating: "well", decisionIds: ["D3"], reason: "D3 refuses a second booking for a taken room and time." },
    { id: "ed.right-size", rating: "well", decisionIds: ["D5"], reason: "D5 uses a hosted calendar instead of a custom server." },
  ],
};

function buildSeedReview(): AssessmentResult {
  const doc = parseDesignDoc(docMarkdown, finalCode, CASE.briefMarkdown, messages);
  const discarded = { count: 0 };
  const evidence = validateFactEvidence(EVIDENCE, {
    factIds: CASE.facts.filter((fact) => fact.disclosure !== "given").map((fact) => fact.id),
    checkSurfaced: cuePrefilter(CASE, messages),
    messages,
    docMarkdown,
    discarded,
  });
  if (discarded.count > 0) throw new Error("A quote in the community-room seed review doesn't verify.");
  const found = foundFromEvidence(CASE, evidence);
  const decisionIds = doc.decisions.map((decision) => decision.id);
  return {
    caseId: CASE.id,
    caseVersion: CASE.version,
    model: "prepopulated example",
    promptVersion: "seed",
    reviewedAt: Date.parse("2026-09-30T09:00:00+08:00"),
    fairness: { clientFailed: [], inventedStatements: [] },
    found: { facts: found },
    links: computeLinks({ doc, consistency: checkConsistency(doc), facts: CASE.facts, found }),
    soundness: {
      requirements: validateRatings(SOUNDNESS.requirements, doc.requirements.map((item) => item.id), "requirements"),
      decisions: validateRatings(SOUNDNESS.decisions, decisionIds, "decisions"),
      sketches: validateRatings(SOUNDNESS.sketches, usableSketches(doc.decisions).map((item) => item.id), "sketches"),
      expectedDecisions: validateExpectedDecisions(
        SOUNDNESS.expectedDecisions,
        CASE.expectedDecisions.map((item) => item.id),
        decisionIds,
      ),
    },
    verification: { discardedQuotes: 0 },
  };
}

export const COMMUNITY_ROOM_SEED = {
  messages,
  docMarkdown,
  finalCode,
  review: buildSeedReview(),
};
