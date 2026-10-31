// WP11: the report renders from fixture results in each mode (server-rendered, so no browser needed).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { askRows, levelRecap, summaryLine } from "./reportModel";
import type { SessionMode } from "@/review/types";
import { COMMUNITY_ROOM_CASE } from "@/cases/community-room";
import { runBanoCheck } from "@/review/bano";
import { tagMessages } from "@/review/levels/questionTags";
import { BanoPanel } from "@/workspace/report/sections/BanoPanel";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "@/examples/community-room/seed";
import { parseDesignDoc } from "@/designDoc/parse";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "@/designDoc/template";
import { ReportView } from "./ReportView";
import { computeElicitation } from "@/review/levels/elicitation";
import { readIsoCritique } from "@/review/judge/summaryReview";
import { ActivityBody } from "@/workspace/report/sections/ActivityBody";
import { JustifyBody } from "@/workspace/report/sections/JustifyBody";

const citation = { onBrief: () => {}, onChat: () => {} };

function snapshotOf(seed: typeof COMMUNITY_ROOM_SEED, brief = COMMUNITY_ROOM_CASE.briefMarkdown) {
  return {
    messages: seed.messages,
    docMarkdown: seed.docMarkdown,
    finalCode: seed.finalCode,
    parsed: parseDesignDoc(seed.docMarkdown, seed.finalCode, brief, seed.messages),
  };
}

const report = (mode: SessionMode, admin: boolean, seed = COMMUNITY_ROOM_SEED) =>
  renderToStaticMarkup(
    <ReportView
      result={{ ...seed.review, mode }}
      snapshot={snapshotOf(seed)}
      caseDefinition={COMMUNITY_ROOM_CASE}
      mode={mode}
      admin={admin}
      timeline={[]}
      citation={citation}
      template={EMPTY_DESIGN_DOC_TEMPLATE}
    />,
  );

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("the report renders in every mode", () => {
  it("shows the five summary sections in order", () => {
    const markup = report("practice", false);
    const ids = [
      "report-layer-chatbot",
      "report-layer-elicitation",
      "report-layer-design-doc",
      "report-layer-scenarios",
      "report-layer-overall",
    ];
    for (let i = 1; i < ids.length; i++) {
      expect(markup.indexOf(ids[i])).toBeGreaterThan(markup.indexOf(ids[i - 1]));
    }
    expect(text(markup)).toContain("IRE");
    expect(text(markup)).toContain("TKQR");
  });

  it("shows chatbot diagnostics and Bano feedback to all participants", () => {
    for (const mode of ["practice", "assessment", "research"] as const) {
      const html = text(report(mode, false));
      expect(html).toContain("invented details");
      expect(html).toContain("How you interviewed");
    }
  });

  it("shows complete example coverage", () => {
    const html = text(report("practice", false, COMMUNITY_ROOM_COMPLETE_SEED));
    expect(html).toContain("1. AI Client Chatbot");
    expect(html).toContain("4/4 hidden requirements elicited");
  });
  it("starts with the later sections, the measures and the interview check folded", () => {
    const markup = report("practice", false);
    const folded = (id: string) => new RegExp(`<section[^>]*is-collapsed[^>]*id="${id}"|<section[^>]*id="${id}"[^>]*is-collapsed`).test(markup);
    // The chatbot and elicitation bands open; the three that follow fold away.
    expect(folded("report-layer-chatbot")).toBe(false);
    expect(folded("report-layer-elicitation")).toBe(false);
    for (const id of ["report-layer-design-doc", "report-layer-scenarios", "report-layer-overall"]) expect(folded(id)).toBe(true);
    // Inside elicitation: the measures and the interview check fold, the requirements do not.
    for (const id of ["report-section-elicitation-metrics", "report-section-elicitation-bano"]) expect(folded(id)).toBe(true);
    expect(folded("report-section-elicitation-requirements")).toBe(false);
  });

  it("draws the requirement table and the detail of the requirement it selects", () => {
    const html = text(report("practice", false));
    expect(html).toContain("Requirements found and missed");
    expect(html).toContain("Requirement detail");
    // The first requirement that did not come out is selected, so its detail is the one shown.
    expect(report("practice", false)).toContain('aria-selected="true"');
    expect(html).toContain("What the client was holding");
    expect(html).toContain("What happened");
  });

  it("says the turns were never classified instead of drawing a table of blanks", () => {
    const seed = COMMUNITY_ROOM_SEED;
    const unlabelled = {
      ...seed.review,
      process: {
        ...seed.review.process,
        elicitation: computeElicitation(COMMUNITY_ROOM_CASE, seed.messages, [], null, ["rate limited"]),
      },
    };
    const html = text(
      renderToStaticMarkup(
        <ReportView
          result={unlabelled}
          snapshot={snapshotOf(seed)}
          caseDefinition={COMMUNITY_ROOM_CASE}
          mode="practice"
          timeline={[]}
          citation={citation}
          template={EMPTY_DESIGN_DOC_TEMPLATE}
        />,
      ),
    );
    expect(html).toContain("none classified");
    expect(html).toContain("rate limited");
    expect(html).not.toContain("Newly elicited");
  });

  it("critiques the design against the ISO 25010 characteristics", () => {
    const seed = COMMUNITY_ROOM_SEED;
    const reviewed = {
      ...seed.review,
      isoCritique: readIsoCritique(
        [
          {
            id: "reliability",
            verdict: "weak",
            summary: "Nothing recovers a failed booking.",
            weaknesses: [{ point: "No retry anywhere", refs: [], quote: null }],
          },
        ],
        new Set<string>(),
        seed.docMarkdown,
      ),
    };
    const html = text(
      renderToStaticMarkup(
        <ReportView
          result={reviewed}
          snapshot={snapshotOf(seed)}
          caseDefinition={COMMUNITY_ROOM_CASE}
          mode="practice"
          timeline={[]}
          citation={citation}
          template={EMPTY_DESIGN_DOC_TEMPLATE}
        />,
      ),
    );
    expect(html).toContain("ISO/IEC 25010");
    expect(html).toContain("1/9 characteristics addressed");
    expect(html).toContain("Reliability");
    expect(html).toContain("Nothing recovers a failed booking.");
    for (const column of ["What's good", "What's not so good", "What to improve"]) expect(html).toContain(column);
    // A point the judge could not quote is kept, and said to be unbacked.
    expect(html).toContain("No quote from your work backs this up");
    // Every characteristic the design never touches is named once, not given a part of its own.
    expect(html).toContain("Not addressed by this design: Functional suitability");
  });

  it("draws the traceability and rationale webs, with sortable columns and a legend", () => {
    const markup = report("practice", false, COMMUNITY_ROOM_COMPLETE_SEED);
    const html = text(markup);
    // Two webs, each a column of nodes over an SVG of the links between them.
    expect(markup.match(/class="flow-web"/g)).toHaveLength(2);
    expect(markup).toContain("flow-web-lines");
    expect(markup).toContain("flow-web-line");
    expect(markup).toContain("flow-node");
    // Every column heading sorts its column.
    for (const column of ["Source", "Requirement", "Decision", "Design", "Components"]) expect(html).toContain(column);
    expect(markup).toContain("flow-web-sort is-active");
    // Both webs carry their own legend and hint.
    expect(html).toContain("Carried through");
    expect(html).toContain("Click a node to light up everything it comes from and leads to.");
    expect(html).toContain("Hover an item or a link to see the judge's reason.");
  });

  it("classifies every turn of the prepopulated example, so no measure reads as unmeasurable", () => {
    const html = text(report("practice", false, COMMUNITY_ROOM_COMPLETE_SEED));
    // The example carries turn labels, so the table is drawn rather than the "none classified" note.
    expect(html).not.toContain("none classified");
    expect(html).not.toContain("could not be told apart");
    expect(html).toContain("Newly elicited");
    expect(html).toContain("probe");
    // A measure with nothing in its denominator says what the interview did, not that it failed.
    const sparse = text(report("practice", false, COMMUNITY_ROOM_SEED));
    for (const page of [html, sparse]) expect(page).not.toContain("nothing to measure");
  });

  it("lists the links under the traceability web and the judgments under the rationale web", () => {
    const markup = report("practice", false, COMMUNITY_ROOM_COMPLETE_SEED);
    const html = text(markup);
    // Traceability: the web, then the A/B/C link lists, each naming what is lost and what has no origin.
    expect(html).toContain("Flow of references");
    for (const cell of ["A. Source → Requirements", "B. Requirements → Decisions", "C. Decisions → Components"]) {
      expect(html).toContain(cell);
    }
    expect(html).toContain("Forward: lost along the way");
    expect(html).toContain("Backward: no origin");
    for (const group of ["Dropped requirements", "Uncited requirements", "Unused requirements", "Unsupported decisions", "Not drawn", "Unexplained components", "Unexplained connections"]) {
      expect(html).toContain(group);
    }
    // Rationale: the web, then one judged row per requirement and decision.
    expect(html).toContain("Soundness of references");
    expect(markup).toContain("judged-row");
    expect(html).toContain("Its quote");
    expect(html).toContain("Against its quote");
    expect(html).toContain("On its own");
    expect(html).toContain("Its requirements");
    expect(html).toContain("Against its decision");
    expect(html).toContain("Into the diagram as");
  });

  it("shows a judgment for every scenario and a critique for every ISO characteristic it addressed", () => {
    const html = text(report("practice", false, COMMUNITY_ROOM_COMPLETE_SEED));
    // Scenario adequacy: a real reason per dimension, never the unjudged placeholder.
    expect(html).not.toContain("No verified judgment available");
    expect(html).not.toContain("Not checked in this review");
    expect(html).toContain("One record that refuses a taken slot");
    // ISO 25010: the characteristics the design addressed, and one line for the rest.
    expect(html).toContain("6/9 characteristics addressed");
    expect(html).toContain("Reliability");
    expect(html).toContain("Not addressed by this design:");
    // The interview check can now measure pauses, because the example carries a clock.
    expect(html).not.toContain("no timestamps");
  });

  it("reveals practice answer notes in Scenario Adequacy after review only", () => {
    expect(text(report("practice", false))).toContain("A good answer:");
    expect(text(report("assessment", false))).not.toContain("A good answer:");
    expect(text(report("research", false))).not.toContain("A good answer:");
  });
  it("shows Try asking only in practice mode", () => {
    const practice = askRows(COMMUNITY_ROOM_SEED.review, COMMUNITY_ROOM_CASE, "practice");
    const research = askRows(COMMUNITY_ROOM_SEED.review, COMMUNITY_ROOM_CASE, "research");
    expect(practice[0]).toMatchObject({ status: "fail", tryAsking: "Why do you think the double bookings happen?" });
    expect(research.some((row) => row.tryAsking)).toBe(false);
    expect(summaryLine(practice)).toBe("2 passed · 1 failed · 1 skipped");
  });

  it("recaps what the engineer did at every level, with no verdict in it", () => {
    const recap = levelRecap(COMMUNITY_ROOM_SEED.review, snapshotOf(COMMUNITY_ROOM_SEED).parsed);
    expect(recap.gate).toContain("ended it with End interview");
    expect(recap.ask).toContain("left out because the client didn't answer");
    expect(recap.keep).toMatch(/You wrote \d+ requirements? and \d+ decisions?/);
    expect(recap.fit).toContain("scenarios");
  });
});

describe("the Justify and Scenario Adequacy sections", () => {
  const doc = snapshotOf(COMMUNITY_ROOM_SEED).parsed;
  const justify = (mode: SessionMode, showRuns: boolean) =>
    text(renderToStaticMarkup(<JustifyBody result={COMMUNITY_ROOM_SEED.review} caseId={COMMUNITY_ROOM_CASE.id} doc={doc} mode={mode} showRuns={showRuns} />));
  const fit = (mode: SessionMode) => text(report(mode, false));

  it("reads like a GitHub review: Comment, Request changes, Uncertain and Not judged", () => {
    const html = justify("practice", false);
    for (const label of ["Comment", "Request changes", "Uncertain", "Not judged", "Resolve conversation"]) expect(html).toContain(label);
    const scenarios = fit("practice");
    for (const label of ["A good answer:", "Decision link", "Diagram linkage", "Design justification"]) expect(scenarios).toContain(label);
    expect(scenarios).toContain("No picked box is a [datastore].");
  });

  it("names each item but doesn't reprint the doc, which is in the pane on the left", () => {
    const html = justify("practice", false);
    expect(html).toContain("R1");
    // The requirement's own words appear once as a title, not as the full doc with its citations.
    expect(html).not.toContain("## Requirements");
  });

  it("research admin sees each judge run, and no teaching notes", () => {
    expect(justify("research", true)).toContain("Runs: sound, sound, weak");
    expect(justify("research", true)).not.toContain("Resolve conversation");
    expect(fit("research")).not.toContain("A good answer:");
  });

});

describe("the Activity section", () => {
  it("gives advice in practice mode and numbers in the admin view", () => {
    const props = {
      result: COMMUNITY_ROOM_SEED.review,
      caseId: COMMUNITY_ROOM_CASE.id,
      messages: COMMUNITY_ROOM_SEED.messages,
      timeline: [],
      timeOnTaskMs: 1_200_000,
    };
    const practice = text(renderToStaticMarkup(<ActivityBody {...props} mode="practice" showNumbers={false} />));
    expect(practice).toContain("How you worked (teaching only, not scored)");
    expect(practice).toContain("20 min");
    expect(practice).toContain("The shape of your session");
    const admin = text(renderToStaticMarkup(<ActivityBody {...props} mode="research" showNumbers />));
    expect(admin).toContain("How you worked (rules only, not scored)");
    expect(admin).toContain("open");
    expect(admin).not.toContain("teaching only");
  });
});

describe("the interview-mistake check", () => {
  const BANO = runBanoCheck({
    caseDefinition: COMMUNITY_ROOM_CASE,
    messages: COMMUNITY_ROOM_SEED.messages,
    tags: tagMessages(COMMUNITY_ROOM_SEED.messages).tags,
  });

  const panel = (showNumbers: boolean, mode: SessionMode = "practice") =>
    text(
      renderToStaticMarkup(
        <BanoPanel report={BANO} caseId={COMMUNITY_ROOM_CASE.id} mode={mode} showNumbers={showNumbers} defaultOpen />,
      ),
    );

  it("groups the mistakes by theme, in the order the paper uses", () => {
    const html = panel(false);
    const labels = ["Question formulation", "Question omission", "Interview order", "Communication", "Analyst behaviour", "Customer interaction", "Teamwork and planning"];
    for (const label of labels) expect(html).toContain(label);
    for (let index = 1; index < labels.length; index += 1) {
      expect(html.indexOf(labels[index])).toBeGreaterThan(html.indexOf(labels[index - 1]));
    }
  });

  it("says it is not scored, and never prints a score", () => {
    const html = panel(false);
    expect(html).toContain("not scored");
    expect(html).not.toMatch(/score of|total of|\bmark\b/i);
  });

  it("names a mistake it found and the messages where it happened", () => {
    const html = panel(false);
    // The seeded interview never asks what a good outcome looks like.
    expect(html).toContain("Never asks about goals or what success looks like");
    expect(html).toContain("No message asked about goals or success.");
    // And its advice, which is practice-mode only.
    expect(html).toContain("Ask what a good outcome looks like before you discuss solutions.");
  });

  it("says what a text chat can't show, and cites the paper", () => {
    const html = panel(false);
    expect(html).toContain("Not checked in a text chat: tone of voice, interrupting, team coordination.");
    expect(html).toContain("Bano, M., Zowghi, D.");
  });

  it("keeps the weak items and the provenance for the admin view", () => {
    expect(panel(false)).not.toContain("Lacks confidence");
    expect(panel(false)).not.toContain("fnv1a32:");
    expect(panel(true)).toContain("Lacks confidence");
    expect(panel(true)).toContain("fnv1a32:");
  });

  it("drops the tips outside practice mode", () => {
    expect(panel(true, "research")).not.toContain("Ask what a good outcome looks like");
  });

  it("is shown to participants in every mode", () => {
    for (const mode of ["practice", "assessment", "research"] as const) {
      expect(text(report(mode, false))).toContain("How you interviewed");
    }
  });
});
