// WP11: the report renders from fixture results in each mode (server-rendered, so no browser needed).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { askRows, levelRecap, summaryLine } from "../../../assessment/reportModel";
import type { SessionMode } from "../../../assessment/types";
import { BRIGHTPATH_CASE } from "../../../cases/brightpath";
import { BRIGHTPATH_SEED } from "../../../cases/brightpath.seed";
import { COMMUNITY_ROOM_CASE } from "../../../cases/community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "../../../cases/community-room.seed";
import { parseDesignDoc } from "../../../designDoc/parse";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../../../designDoc/template";
import { ReportView } from "./ReportView";
import { ActivityBody } from "./sections/ActivityBody";
import { FitBody } from "./sections/FitBody";
import { JustifyBody } from "./sections/JustifyBody";

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
  it("practice: checks with icons, the fair-session banner, separate numbers and the Ask summary line", () => {
    const html = text(report("practice", false));
    for (const level of ["Gate", "Ask", "Keep", "Justify", "Fit"]) expect(html).toContain(level);
    expect(html).toContain("✗");
    expect(html).toContain("1 fact was excluded: you asked well, but the client didn't answer (Rooms and volume).");
    expect(html).toContain("0/1 follow-up facts found");
    expect(html).toContain("2 passed · 1 failed · 1 skipped");
    // Every number says how it was made; Ask's rows are all worked out by code.
    expect(report("practice", false)).toContain('class="method-pill method-code"');
    expect(html).not.toContain("Invented specifics"); // the Gate audit rows are for the research admin
  });

  it("is one page: analytics on top, the five levels in order, Activity last", () => {
    const html = text(report("practice", false));
    const at = (needle: string) => html.indexOf(needle);
    expect(at("Analytics")).toBeGreaterThan(-1);
    expect(at("The five checks, in order")).toBeGreaterThan(at("Analytics"));
    for (const [before, after] of [["Gate", "Ask"], ["Ask", "Keep"], ["Keep", "Justify"], ["Justify", "Fit"]]) {
      expect(html.lastIndexOf(`${before}`)).toBeLessThan(html.lastIndexOf("Activity"));
      expect(at(after)).toBeGreaterThan(at(before));
    }
    expect(at("Activity")).toBeGreaterThan(at("Fit"));
    // Each open section carries the same three parts.
    expect(html).toContain("What you did");
    expect(html).toContain("What went right, what went wrong");
    expect(html).toContain("Suggestion");
  });

  it("shows the AI suggestion on its stage, labelled as judgment", () => {
    const html = text(report("practice", false));
    expect(html).toContain("Ask again in another way when a reply dodges the question.");
    expect(report("practice", false)).toContain('class="method-pill method-ai_judgment"');
  });

  it("research admin: also shows the Gate audit rows", () => {
    const html = text(report("research", true));
    expect(html).toContain("Invented specifics, for a human to audit: “$20” (#8)");
  });

  it("assessment admin: the report without research-only details", () => {
    const html = text(report("assessment", true));
    expect(html).toContain("Review of your design");
    expect(html).not.toContain("Invented specifics");
  });

  it("a complete example passes every check", () => {
    const html = text(report("practice", false, COMMUNITY_ROOM_COMPLETE_SEED));
    expect(html).toContain("Fair session");
    expect(html).toContain("1/1 follow-up facts found");
    expect(html).toContain("4/4 found facts carried through");
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
    expect(recap.keep).toMatch(/You wrote \d+ requirements?, \d+ assumptions? and \d+ decisions?/);
    expect(recap.fit).toContain("scenarios");
  });
});

describe("the Justify and Fit sections", () => {
  const doc = snapshotOf(COMMUNITY_ROOM_SEED).parsed;
  const justify = (mode: SessionMode, showRuns: boolean) =>
    text(renderToStaticMarkup(<JustifyBody result={COMMUNITY_ROOM_SEED.review} caseId={COMMUNITY_ROOM_CASE.id} doc={doc} mode={mode} showRuns={showRuns} />));
  const fit = (mode: SessionMode) =>
    text(renderToStaticMarkup(<FitBody result={COMMUNITY_ROOM_SEED.review} caseDefinition={COMMUNITY_ROOM_CASE} mode={mode} />));

  it("reads like a GitHub review: Comment, Request changes, Uncertain and Not judged", () => {
    const html = justify("practice", false);
    for (const label of ["Comment", "Request changes", "Uncertain", "Not judged", "Resolve conversation"]) expect(html).toContain(label);
    const scenarios = fit("practice");
    for (const label of ["A good answer:", "Partly handled", "Not handled"]) expect(scenarios).toContain(label);
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

  it("works for the other case too", () => {
    const bpDoc = parseDesignDoc(BRIGHTPATH_SEED.docMarkdown, BRIGHTPATH_SEED.finalCode, BRIGHTPATH_CASE.briefMarkdown, BRIGHTPATH_SEED.messages);
    const html = text(
      renderToStaticMarkup(<JustifyBody result={BRIGHTPATH_SEED.review} caseId={BRIGHTPATH_CASE.id} doc={bpDoc} mode="practice" showRuns={false} />),
    );
    expect(html).toContain("Request changes");
    const scenarios = text(renderToStaticMarkup(<FitBody result={BRIGHTPATH_SEED.review} caseDefinition={BRIGHTPATH_CASE} mode="practice" />));
    expect(scenarios).toContain("A gateway and a queue so no report is lost.");
  });
});

describe("the Activity section", () => {
  it("gives advice in practice mode and numbers in the admin view", () => {
    const props = { result: COMMUNITY_ROOM_SEED.review, messages: COMMUNITY_ROOM_SEED.messages, timeline: [], timeOnTaskMs: 1_200_000 };
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
