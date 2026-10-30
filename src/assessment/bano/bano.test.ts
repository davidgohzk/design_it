import { describe, expect, it } from "vitest";
import { COMMUNITY_ROOM_CASE } from "../../cases/community-room";
import { GOLDEN_TRANSCRIPT } from "../../cases/community-room/fixtures";
import GOLDEN_REPORT from "./golden.bano.json";
import type { ChatMessage, InterviewEnd } from "../../shared/lib/types";
import { tagMessages } from "../questionTags";
import { banoEvidence, runBanoCheck } from "./index";
import { BANO_CHECKLIST, BANO_CODE_IDS, BANO_AI_IDS } from "./checklist";
import { BANO_CONFIG, configHash } from "./config";
import { BANO_RULES, CODE_IDS_WITHOUT_RULES } from "./rules";
import { combineBanoRuns, readBanoRun } from "./ai";
import type { BanoStatus } from "./types";

const CASE = COMMUNITY_ROOM_CASE;
const START = Date.parse("2026-01-01T09:00:00Z");

/**
 * A transcript, written the way it reads: "c:…" is the client, "e:…" the engineer. A trailing "@n"
 * puts that message n minutes after the start; without one, each message is a minute after the last.
 */
function transcript(...lines: string[]): ChatMessage[] {
  let minute = 0;
  return lines.map((line) => {
    const match = line.match(/\s*@(\d+)\s*$/);
    const text = match ? line.slice(0, match.index).trimEnd() : line;
    minute = match ? Number(match[1]) : minute + 1;
    return {
      role: text.startsWith("e:") ? "user" : "assistant",
      content: text.slice(2).trim(),
      ts: START + minute * 60_000,
    };
  });
}

/** The same transcript with no timestamps: a seeded or replayed session. */
const noTimes = (messages: ChatMessage[]) =>
  messages.map((message) => {
    const copy = { ...message };
    delete copy.ts;
    return copy;
  });

/** Marks a client message as having given these facts, the way the server's log does. */
const disclose = (messages: ChatMessage[], index: number, factIds: string[]) =>
  messages.map((message, position) => (position === index ? { ...message, disclosedFactIds: factIds } : message));

const ENDED_BY_BUTTON: InterviewEnd = { at: START + 20 * 60_000, how: "button", reason: "I have enough to start" };
const ENDED_BY_CAP: InterviewEnd = { at: START + 45 * 60_000, how: "time_cap", reason: "" };

type RuleCase = { messages: ChatMessage[]; interviewEnd?: InterviewEnd | null };

const check = ({ messages, interviewEnd }: RuleCase) =>
  runBanoCheck({ caseDefinition: CASE, messages, tags: tagMessages(messages).tags, interviewEnd: interviewEnd ?? ENDED_BY_BUTTON });

const statusOf = (id: string, ruleCase: RuleCase) => check(ruleCase).items.find((item) => item.id === id)?.status;

const itemOf = (id: string, ruleCase: RuleCase) => check(ruleCase).items.find((item) => item.id === id)!;

/**
 * A well-run short interview. Used as the "not observed" base for the session-wide rules, so each
 * negative case differs from the positive one only in the thing being tested.
 */
const GOOD = [
  "c:Hi, I'm Mei, I run the front desk.",
  "e:Hi Mei, thanks for your time. Walk me through what happens today when someone wants a room.",
  "c:They come to the desk or call, and we write it in the paper book. We keep getting double bookings.",
  "e:Why do you think the double bookings happen?",
  "c:Phone bookings go on sticky notes, and sometimes the note never makes it into the book.",
  "e:Who else takes bookings at the desk?",
  "c:Two of us on alternating shifts, and volunteers at the weekend.",
  "e:What matters most to fix first?",
  "c:Stopping the clashes. That's what upsets people.",
  "e:How will you know the new way is working?",
  "c:No more double bookings, really.",
  "e:So to confirm: one paper book, phone bookings on sticky notes, and clashes are the thing to fix?",
  "c:That's it exactly.",
];

/** One positive and one negative case for every code rule, from §10 of the spec. */
const CASES: Record<string, { observed: RuleCase; notObserved: RuleCase; uncertain?: RuleCase }> = {
  QF2: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:Do you need a backend database for this?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:Where do you write bookings down now?") },
  },
  QF4: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:Should we use an app for bookings?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:What goes wrong with bookings today?") },
  },
  QF5: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:How many rooms, who books them, and what times are busiest?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:How many rooms do you have?") },
  },
  QO1: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:How do you take a booking today?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:Who else takes bookings at the desk?") },
  },
  QO2: {
    // Five unrelated questions: nothing picks up what the client just said.
    observed: {
      messages: transcript(
        "c:Hi, I'm Mei.",
        "e:How many rooms are there?",
        "c:Three.",
        "e:Who pays the electricity bill?",
        "c:The council.",
        "e:What time do you close?",
        "c:Six.",
        "e:Is parking free?",
        "c:Yes.",
      ),
    },
    notObserved: { messages: transcript(...GOOD) },
    uncertain: { messages: transcript("c:Hi, I'm Mei.", "e:How many rooms are there?") },
  },
  QO3: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:Who else takes bookings?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:Walk me through what happens when someone calls.") },
  },
  QO4: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:How do you take a booking?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:What matters most to fix first?") },
  },
  QO6: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:How do you take a booking?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:How will you know the new way is working?") },
  },
  IO1: {
    observed: {
      messages: transcript("c:Hi, I'm Mei.", "e:How many rooms?", "c:Three.", "e:And how many bookings a week?", "c:Thirty."),
    },
    notObserved: { messages: transcript(...GOOD) },
  },
  IO2: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:What features should the system have?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:Hi Mei, thanks for your time. Can you tell me about the desk?") },
  },
  IO4: {
    observed: {
      messages: transcript(
        "c:Hi, I'm Mei.",
        "e:How many rooms are there?",
        "c:Three rooms.",
        "e:Sorry, how many rooms are there?",
        "c:Three.",
      ),
    },
    notObserved: {
      messages: transcript("c:Hi, I'm Mei.", "e:How many rooms are there?", "c:Three rooms.", "e:Which room gets booked most?", "c:The hall."),
    },
  },
  CS3: {
    observed: {
      messages: disclose(
        transcript("c:Hi, I'm Mei.", "e:How many rooms are there?", "c:We have three rooms: the activity hall, meeting room and dance studio.", "e:And how many rooms do you have?"),
        2,
        ["cr.scale"],
      ),
    },
    notObserved: {
      messages: disclose(
        transcript("c:Hi, I'm Mei.", "e:How many rooms are there?", "c:We have three rooms: the activity hall, meeting room and dance studio.", "e:Which of the three rooms clashes most?"),
        2,
        ["cr.scale"],
      ),
    },
    // No disclosure log, so the rule can't tell what was already answered.
    uncertain: {
      messages: transcript("c:Hi, I'm Mei.", "e:How many rooms are there?", "c:Three rooms.", "e:And how many rooms do you have?"),
    },
  },
  CI1: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:How many rooms are there?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:Hi Mei, how many rooms are there?") },
  },
  CI2: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:You'd want an online system, right?") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:What would make booking easier for you?") },
  },
  TP2: {
    observed: { messages: transcript(...GOOD), interviewEnd: ENDED_BY_CAP },
    notObserved: { messages: transcript(...GOOD), interviewEnd: ENDED_BY_BUTTON },
    uncertain: { messages: noTimes(transcript(...GOOD)), interviewEnd: null },
  },
  TP3: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:Do you use a paper book for bookings?") },
    notObserved: {
      messages: transcript("c:Hi, I'm Mei.", "e:You mentioned the paper book. Just to check, what happens when it's wrong?"),
    },
  },
  TP5: {
    observed: { messages: transcript("c:Hi, I'm Mei.", "e:How many rooms are there? @9") },
    notObserved: { messages: transcript("c:Hi, I'm Mei.", "e:How many rooms are there?") },
    uncertain: { messages: noTimes(transcript("c:Hi, I'm Mei.", "e:How many rooms are there?")) },
  },
};

describe("the checklist", () => {
  it("has 33 items with unique ids", () => {
    expect(BANO_CHECKLIST).toHaveLength(33);
    expect(new Set(BANO_CHECKLIST.map((item) => item.id)).size).toBe(33);
  });

  it("splits into 17 code, 11 AI, 2 pointers and 3 not applicable", () => {
    const by = (source: string) => BANO_CHECKLIST.filter((item) => item.source === source).length;
    expect(by("code")).toBe(17);
    expect(by("ai")).toBe(11);
    expect(by("see_ask")).toBe(2);
    expect(by("not_applicable")).toBe(3);
  });

  it("marks the four analyst-behaviour items weak", () => {
    expect(BANO_CHECKLIST.filter((item) => item.weak).map((item) => item.id)).toEqual(["AB1", "AB2", "AB3", "AB4"]);
  });

  it("gives every code item a rule, and every rule a code item", () => {
    expect(CODE_IDS_WITHOUT_RULES).toEqual([]);
    expect([...BANO_RULES].map((rule) => rule.id).sort()).toEqual([...BANO_CODE_IDS].sort());
  });

  it("gives every AI item a definition and an example for the Community Room case", () => {
    for (const id of BANO_AI_IDS) {
      const item = BANO_CHECKLIST.find((candidate) => candidate.id === id)!;
      expect(item.ai?.definition, id).toBeTruthy();
      for (const caseId of ["community-room"]) {
        expect(item.ai?.mistakeExample[caseId], `${id} ${caseId}`).toBeTruthy();
        expect(item.ai?.goodExample[caseId], `${id} ${caseId}`).toBeTruthy();
      }
    }
  });
});

describe("the code rules", () => {
  it("each have a positive and a negative case", () => {
    expect(Object.keys(CASES).sort()).toEqual([...BANO_CODE_IDS].sort());
  });

  for (const [id, ruleCase] of Object.entries(CASES)) {
    const expected: BanoStatus = BANO_CHECKLIST.find((item) => item.id === id)?.infoOnly ? "info" : "observed";
    describe(id, () => {
      it(`reports ${expected} when the mistake is there`, () => {
        expect(statusOf(id, ruleCase.observed)).toBe(expected);
      });

      it("reports not observed when it isn't", () => {
        expect(statusOf(id, ruleCase.notObserved)).toBe(expected === "info" ? "info" : "not_observed");
      });

      if (ruleCase.uncertain) {
        it("reports uncertain without the evidence it needs", () => {
          expect(statusOf(id, ruleCase.uncertain!)).toBe("uncertain");
        });
      }
    });
  }

  it("points at the messages where the mistake happened", () => {
    expect(itemOf("QF2", CASES.QF2.observed).evidence).toEqual([{ messageIndex: 1, quote: "database" }]);
  });

  it("explains an omission instead of pointing at a message", () => {
    const item = itemOf("QO6", CASES.QO6.observed);
    expect(item.evidence).toEqual([]);
    expect(item.note).toBe("No message asked about goals or success.");
  });

  it("never observes a timing mistake without timestamps", () => {
    const report = check({ messages: noTimes(transcript(...GOOD)), interviewEnd: null });
    for (const id of ["TP2", "TP5"]) {
      expect(report.items.find((item) => item.id === id)?.status, id).toBe("uncertain");
    }
  });

  it("reports uncertain for everything when nothing was asked", () => {
    const report = check({ messages: transcript("c:Hi, I'm Mei.") });
    for (const id of BANO_CODE_IDS) {
      expect(report.items.find((item) => item.id === id)?.status, id).toBe("uncertain");
    }
  });

  it("treats a late first problem question as bad time management", () => {
    const messages = transcript(
      "c:Hi, I'm Mei.",
      "e:Hi Mei, thanks for your time. @1",
      "c:No trouble at all.",
      "e:What goes wrong with bookings today? @30",
    );
    expect(statusOf("TP2", { messages, interviewEnd: { at: START + 40 * 60_000, how: "button", reason: "done" } })).toBe("observed");
  });
});

describe("the AI items", () => {
  const messages = transcript("c:Hi, I'm Mei.", "e:Can you tell me about the centre?");
  const run = (observed: boolean, quote: string) => [{ id: "QF1", observed, evidence: [{ messageIndex: 1, quote }], reason: "Too broad." }];
  const report = (replies: unknown[]) =>
    runBanoCheck({ caseDefinition: CASE, messages, tags: tagMessages(messages).tags }, { replies });
  const qf1 = (replies: unknown[]) => report(replies).items.find((item) => item.id === "QF1")!;

  it("are uncertain when the judge was never asked", () => {
    for (const id of BANO_AI_IDS) {
      expect(report([]).items.find((item) => item.id === id)?.status, id).toBe("uncertain");
    }
  });

  it("stand when the runs agree and the quote verifies", () => {
    const item = qf1([run(true, "tell me about the centre"), run(true, "tell me about the centre"), run(true, "tell me about the centre")]);
    expect(item.status).toBe("observed");
    expect(item.method).toBe("ai_verified_quote");
    expect(item.evidence[0]).toMatchObject({ messageIndex: 1 });
  });

  it("stand on a majority of three", () => {
    const item = qf1([run(true, "tell me about the centre"), run(true, "tell me about the centre"), run(false, "")]);
    expect(item.status).toBe("observed");
  });

  it("are uncertain on a split vote", () => {
    const split = [run(true, "tell me about the centre"), run(false, ""), run(true, "words nobody wrote")];
    const item = qf1(split);
    expect(item.status).toBe("uncertain");
    expect(item.runs).toEqual(["observed", "not_observed", "uncertain"]);
  });

  it("are uncertain with a fabricated quote, and count it as discarded", () => {
    const fabricated = [run(true, "the sticky notes are a disaster"), run(true, "the sticky notes are a disaster"), run(true, "the sticky notes are a disaster")];
    const built = report(fabricated);
    expect(built.items.find((item) => item.id === "QF1")?.status).toBe("uncertain");
    expect(built.discardedAiItems).toBe(3);
  });

  it("ignore a quote attributed to the client", () => {
    const discarded = { count: 0 };
    const entries = readBanoRun([{ id: "QF1", observed: true, evidence: [{ messageIndex: 0, quote: "I'm Mei" }] }], messages, discarded);
    expect(entries.get("QF1")?.status).toBe("uncertain");
    expect(discarded.count).toBe(1);
  });

  it("are uncertain when a run didn't answer at all", () => {
    const entries = combineBanoRuns([new Map(), new Map(), new Map()]);
    expect(entries.get("QF1")?.status).toBe("uncertain");
  });

  it("send the judge a definition and both examples for this case", () => {
    const evidence = banoEvidence({ caseDefinition: CASE, messages, tags: [] });
    expect(evidence.items).toHaveLength(11);
    expect(evidence.items[0]).toMatchObject({ id: "QF1", mistakeExample: "Can you tell me about the centre?" });
    expect(evidence.transcript[1]).toMatchObject({ messageIndex: 1, who: "engineer" });
  });
});

describe("the report", () => {
  const report = check({ messages: transcript(...GOOD) });

  it("has one entry per checklist item, in checklist order", () => {
    expect(report.items.map((item) => item.id)).toEqual(BANO_CHECKLIST.map((item) => item.id));
  });

  it("leaves pointers, not-applicable items and information out of the theme counts", () => {
    const counted = report.items.filter((item) => !["see_ask", "not_applicable", "info"].includes(item.status));
    expect(report.themes.reduce((total, theme) => total + theme.checked, 0)).toBe(counted.length);
    const omission = report.themes.find((theme) => theme.theme === "question_omission")!;
    // QO5 and QO7 defer to Ask, so five of the seven items are checked here.
    expect(omission.checked).toBe(5);
  });

  it("never reports a total or a score", () => {
    expect(Object.keys(report)).not.toContain("score");
    expect(Object.keys(report)).not.toContain("total");
    for (const item of report.items) expect(Object.keys(item)).not.toContain("score");
  });

  it("points a see_ask item at the Ask check instead of judging it again", () => {
    const item = report.items.find((candidate) => candidate.id === "QO5")!;
    expect(item.status).toBe("see_ask");
    expect(item.evidence).toEqual([]);
  });

  it("says what a text chat can't show", () => {
    expect(report.items.find((item) => item.id === "CS4")?.note).toBe("Not checked in a text chat: tone of voice.");
  });

  it("records the checklist and the config it used", () => {
    expect(report.checklistVersion).toBe("bano2019-appA-v1");
    expect(report.configHash).toBe(configHash());
    expect(report.promptVersion).toBeUndefined();
  });
});

describe("the config hash", () => {
  it("is the same every time", () => {
    expect(configHash()).toBe(configHash());
  });

  it("changes when a threshold changes", () => {
    expect(configHash({ ...BANO_CONFIG, repeatJaccard: 0.7 })).not.toBe(configHash());
  });

  it("is this value until the config is deliberately tuned", () => {
    expect(configHash()).toMatch(/^fnv1a32:[0-9a-z]+$/);
  });
});

describe("the golden transcript", () => {
  const report = runBanoCheck({
    caseDefinition: CASE,
    messages: GOLDEN_TRANSCRIPT,
    tags: tagMessages(GOLDEN_TRANSCRIPT).tags,
    interviewEnd: { at: Date.parse("2026-09-30T08:40:00+08:00"), how: "button", reason: "I have enough to start designing" },
  });

  it("matches the checked-in fixture", () => {
    // Regenerate with scripts/bano-labelling-sheet.ts's sibling snippet in the README if a rule
    // changes on purpose; a surprise here means a rule moved without anyone meaning it to.
    expect(report).toEqual(GOLDEN_REPORT);
  });

  it("runs without errors and decides every item", () => {
    expect(report.items).toHaveLength(33);
    for (const item of report.items) expect(item.status, item.id).toBeTruthy();
  });

  it("sees that it asked who is involved and how things work today", () => {
    for (const id of ["QO1", "QO3"]) {
      expect(report.items.find((item) => item.id === id)?.status, id).toBe("not_observed");
    }
  });

  it("sees that even the model interview never asks about priorities or success", () => {
    // A real finding about the seeded example, not a quirk of the rules: it asks what happens and who
    // is involved, and never what matters most or what a good outcome looks like.
    for (const id of ["QO4", "QO6"]) {
      expect(report.items.find((item) => item.id === id)?.status, id).toBe("observed");
    }
  });

  it("judges its timing, because the seeded messages carry a clock", () => {
    // The example opens on the problem two minutes in, so there is no late start to report, and the
    // one gap longer than the pause threshold is reported as information, never as a mistake.
    expect(report.items.find((item) => item.id === "TP2")?.status).toBe("not_observed");
    const pauses = report.items.find((item) => item.id === "TP5");
    expect(pauses?.status).toBe("info");
    expect(pauses?.note).toContain("min");
  });
});

describe("asking what the brief already said", () => {
  const ask = (text: string) =>
    runBanoCheck({
      caseDefinition: CASE,
      messages: transcript("c:Hi, I'm Mei.", `e:${text}`),
      tags: tagMessages(transcript("c:Hi, I'm Mei.", `e:${text}`)).tags,
    }).items.find((item) => item.id === "TP3")?.status;

  it("counts a question that just repeats a brief fact", () => {
    expect(ask("Do you use a paper book for the bookings?")).toBe("observed");
  });

  it("lets a question probe beneath a brief fact", () => {
    // The brief says double bookings keep happening. Asking why is the probe that finds the cause.
    expect(ask("Why do you think the double bookings happen?")).toBe("not_observed");
  });
});
