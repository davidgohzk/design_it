// WP11: the report renders from fixture results in each mode (server-rendered, so no browser needed).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { askRows, summaryLine } from "../../../assessment/reportModel";
import type { SessionMode } from "../../../assessment/types";
import { BRIGHTPATH_CASE } from "../../../cases/brightpath";
import { BRIGHTPATH_SEED } from "../../../cases/brightpath.seed";
import { COMMUNITY_ROOM_CASE } from "../../../cases/community-room";
import { COMMUNITY_ROOM_COMPLETE_SEED, COMMUNITY_ROOM_SEED } from "../../../cases/community-room.seed";
import { parseDesignDoc } from "../../../designDoc/parse";
import { EMPTY_DESIGN_DOC_TEMPLATE } from "../../../designDoc/template";
import { ActivityTab } from "./ActivityTab";
import { ReportView } from "./ReportView";
import { ReviewTab } from "./ReviewTab";

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
    expect(html).not.toContain("Client failures:"); // Gate details are for the research admin
  });

  it("research admin: also shows the Gate details", () => {
    const html = text(report("research", true));
    expect(html).toContain("Client failures: 1");
    expect(html).toContain("Invented specifics, for a human to audit: “$20” (#8)");
  });

  it("assessment admin: the report without research-only details", () => {
    const html = text(report("assessment", true));
    expect(html).toContain("Review of your design");
    expect(html).not.toContain("Client failures:");
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
});

describe("Review tab", () => {
  const doc = snapshotOf(COMMUNITY_ROOM_SEED).parsed;
  const review = (mode: SessionMode, showRuns: boolean) =>
    text(
      renderToStaticMarkup(
        <ReviewTab result={COMMUNITY_ROOM_SEED.review} caseDefinition={COMMUNITY_ROOM_CASE} doc={doc} mode={mode} showRuns={showRuns} citation={citation} />,
      ),
    );

  it("reads like a GitHub review: Comment, Request changes, Uncertain and Not judged in the margin", () => {
    const html = review("practice", false);
    for (const label of ["Comment", "Request changes", "Uncertain", "Not judged", "Resolve conversation", "A good answer:", "Partly handled", "Not handled"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("No picked box is a [datastore].");
  });

  it("research admin sees each judge run, and no teaching notes", () => {
    const html = review("research", true);
    expect(html).toContain("Runs: sound, sound, weak");
    expect(html).not.toContain("A good answer:");
    expect(html).not.toContain("Resolve conversation");
  });

  it("works for the other case too", () => {
    const bpDoc = parseDesignDoc(BRIGHTPATH_SEED.docMarkdown, BRIGHTPATH_SEED.finalCode, BRIGHTPATH_CASE.briefMarkdown, BRIGHTPATH_SEED.messages);
    const html = text(
      renderToStaticMarkup(<ReviewTab result={BRIGHTPATH_SEED.review} caseDefinition={BRIGHTPATH_CASE} doc={bpDoc} mode="practice" showRuns={false} citation={citation} />),
    );
    expect(html).toContain("Request changes");
    expect(html).toContain("A gateway and a queue so no report is lost.");
  });
});

describe("Activity tab", () => {
  it("gives advice in practice mode and numbers in the admin view", () => {
    const props = { result: COMMUNITY_ROOM_SEED.review, messages: COMMUNITY_ROOM_SEED.messages, timeline: [], timeOnTaskMs: 1_200_000 };
    const practice = text(renderToStaticMarkup(<ActivityTab {...props} mode="practice" showNumbers={false} />));
    expect(practice).toContain("How you worked (teaching only, not scored)");
    expect(practice).toContain("20 min");
    const admin = text(renderToStaticMarkup(<ActivityTab {...props} mode="research" showNumbers />));
    expect(admin).toContain("How you worked (rules only, not scored)");
    expect(admin).toContain("open");
    expect(admin).not.toContain("teaching only");
  });
});
