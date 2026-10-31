import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SummaryProgress } from "./SummaryProgress";
import { summaryProgress } from "./summaryProgressModel";

describe("summary loading progress", () => {
  it("shows the five summary sections in the finished report's order", () => {
    const html = renderToStaticMarkup(<SummaryProgress progress={{}} extraProgress={{}} />);
    const titles = ["1. AI Client Chatbot", "2. Requirement Elicitation", "3. Design Document", "4. Scenario Adequacy", "5. Overall design · ISO/IEC 25010"];
    for (let index = 1; index < titles.length; index++) expect(html.indexOf(titles[index])).toBeGreaterThan(html.indexOf(titles[index - 1]));
    expect(html).toContain("IRE, ESR and TKQR");
    expect(html).toContain("Bano labelling");
    expect(html).toContain("Rationale links");
    expect(html).toContain("ISO 25010 critique");
    expect(html).not.toContain("Gate");
    expect(html).not.toContain("Keep");
  });

  it("tracks the parts of each section without showing scores or verdicts", () => {
    const sections = summaryProgress(
      {
        gate: { level: "gate", status: "done" },
        ask: { level: "ask", status: "done" },
        keep: { level: "keep", status: "done" },
        justify: { level: "justify", status: "running" },
        fit: { level: "fit", status: "waiting" },
      },
      { bano: { check: "bano", status: "waiting" }, rationale: { check: "rationale", status: "waiting" }, iso: { check: "iso", status: "waiting" } },
    );
    expect(sections.map((section) => section.status)).toEqual(["done", "partial", "running", "waiting", "waiting"]);
    expect(sections[1].steps.map((step) => [step.label, step.status])).toEqual([["IRE, ESR and TKQR", "done"], ["Bano labelling", "waiting"]]);
    expect(summaryProgress({}, { iso: { check: "iso", status: "skipped" } })[4].status).toBe("skipped");
  });
});
