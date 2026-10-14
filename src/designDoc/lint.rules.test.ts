// WP6: each new lint rule has a test that triggers it, each quick fix a test, and both golden docs
// have no problems at all.
import { describe, expect, it } from "vitest";
import { BRIGHTPATH_CASE } from "../cases/brightpath";
import { BRIGHTPATH_COMPLETE_SEED } from "../cases/brightpath.seed";
import { BRIEF, GOLDEN_DOC, GOLDEN_FINAL, GOLDEN_TRANSCRIPT } from "../cases/community-room.fixtures";
import { COMMUNITY_ROOM_COMPLETE_SEED } from "../cases/community-room.seed";
import { checkConsistency } from "./consistency";
import { extractFinalDiagram, setFinalDiagram } from "./finalSection";
import { lintDesignDoc } from "./lint";
import type { LintRule } from "./lint";
import { parseDesignDoc } from "./parse";
import { buildProblems } from "./problemList";
import { quickFixEdit } from "./quickFixes";

/** Lints a whole doc (final diagram included), as the workspace does. */
const lint = (markdown: string, brief = BRIEF, messages = GOLDEN_TRANSCRIPT) => {
  const doc = parseDesignDoc(markdown, extractFinalDiagram(markdown), brief, messages);
  return lintDesignDoc(doc, markdown);
};
const golden = setFinalDiagram(GOLDEN_DOC, GOLDEN_FINAL);
/** Replaces the last occurrence of `target` (the final diagram comes after every sketch). */
const replaceLast = (text: string, target: string, next: string) => {
  const at = text.lastIndexOf(target);
  expect(at).toBeGreaterThanOrEqual(0);
  return text.slice(0, at) + next + text.slice(at + target.length);
};
const rules = (markdown: string) => lint(markdown).map((warning) => warning.rule);
const one = (markdown: string, rule: LintRule) => {
  const found = lint(markdown).filter((warning) => warning.rule === rule);
  expect(found).toHaveLength(1);
  return found[0];
};
const applyFix = (markdown: string, rule: LintRule) => {
  const warning = one(markdown, rule);
  const edit = quickFixEdit(markdown, warning.fix!);
  expect(edit).not.toBeNull();
  return markdown.slice(0, edit!.from) + edit!.insert + markdown.slice(edit!.to);
};

describe("the golden docs", () => {
  it("have no problems at all, and pass C1–C5", () => {
    expect(lint(golden)).toEqual([]);
    expect(lint(COMMUNITY_ROOM_COMPLETE_SEED.docMarkdown, BRIEF, COMMUNITY_ROOM_COMPLETE_SEED.messages)).toEqual([]);
    expect(lint(BRIGHTPATH_COMPLETE_SEED.docMarkdown, BRIGHTPATH_CASE.briefMarkdown, BRIGHTPATH_COMPLETE_SEED.messages)).toEqual([]);
    const doc = parseDesignDoc(golden, GOLDEN_FINAL, BRIEF, GOLDEN_TRANSCRIPT);
    expect(checkConsistency(doc).issues).toEqual([]);
    const bp = BRIGHTPATH_COMPLETE_SEED;
    expect(checkConsistency(parseDesignDoc(bp.docMarkdown, bp.finalCode, BRIGHTPATH_CASE.briefMarkdown, bp.messages)).issues).toEqual([]);
  });
});

describe("new lint rules (WP6)", () => {
  it("flags a decision with no alternative, and its quick fix adds an Instead of: line", () => {
    const markdown = golden.replace("  - Instead of: staff check the calendar by eye before saving\n", "");
    const warning = one(markdown, "no-alternative");
    expect(warning).toMatchObject({ itemId: "D3", severity: "warning", message: "D3 doesn't name an alternative (Instead of:)." });
    const fixed = applyFix(markdown, "no-alternative");
    expect(fixed).toContain("  - Because: [R1](#R1)\n  - Instead of: the alternative you considered\n  - Trade-off: none significant");
    expect(rules(fixed)).not.toContain("no-alternative");
  });

  it("flags a quality that isn't an ISO 25010 characteristic, and its quick fix picks one", () => {
    const markdown = golden.replace("  - Quality: interaction-capability\n  ```mermaid\n  flowchart LR\n    Resident", "  - Quality: speed\n  ```mermaid\n  flowchart LR\n    Resident");
    const warning = one(markdown, "bad-quality");
    expect(warning.message).toBe(
      "D2's quality 'speed' isn't on the list. Pick one of: functional-suitability, performance-efficiency, compatibility, interaction-capability, reliability, security, maintainability, flexibility, safety.",
    );
    expect(markdown.split("\n")[warning.line - 1]).toBe("  - Quality: speed");
    const fixed = applyFix(markdown, "bad-quality");
    expect(fixed).toContain("  - Quality: reliability\n  ```mermaid\n  flowchart LR\n    Resident");
    expect(rules(fixed)).not.toContain("bad-quality");
  });

  it("flags an arrow with no label in a sketch, and its quick fix adds one", () => {
    const markdown = golden.replace('Desk -->|"saves booking"| Calendar', "Desk --> Calendar");
    const warning = one(markdown, "unlabelled-arrow");
    expect(warning).toMatchObject({ itemId: "D2", source: "diagram", message: "The arrow Desk → Calendar has no label (D2's sketch)." });
    expect(markdown.split("\n")[warning.line - 1]).toContain("Desk --> Calendar");
    const fixed = applyFix(markdown, "unlabelled-arrow");
    expect(fixed).toContain('Desk -->|"label"| Calendar');
    expect(rules(fixed)).not.toContain("unlabelled-arrow");
  });

  it("flags an arrow with no label in the final diagram", () => {
    const markdown = golden.replace('SMS -->|"texts booker"| Resident\n```', "SMS --> Resident\n```");
    expect(one(markdown, "unlabelled-arrow")).toMatchObject({ itemId: "final", message: "The arrow SMS → Resident has no label (the final diagram)." });
    expect(applyFix(markdown, "unlabelled-arrow")).toContain('SMS -->|"label"| Resident\n```');
  });

  it("flags a box with no type, and its quick fix adds [container]", () => {
    const markdown = replaceLast(golden, 'SMS["SMS confirmation [external]"]', 'SMS["SMS confirmation"]');
    const warning = one(markdown, "untyped-node");
    expect(warning).toMatchObject({ nodeId: "SMS", itemId: "final" });
    expect(warning.message).toBe("`SMS` has no type (the final diagram). Add [container], [datastore], [system] or [external].");
    expect(markdown.split("\n")[warning.line - 1]).toContain('SMS["SMS confirmation"]');
    const fixed = applyFix(markdown, "untyped-node");
    expect(fixed.slice(fixed.lastIndexOf("## Final diagram"))).toContain('SMS["SMS confirmation [container]"]');
    expect(rules(fixed)).not.toContain("untyped-node");
  });

  it("gives an untyped bare box a label and a type", () => {
    const markdown = "## Decisions\n- **D1** Use a queue\n  - Because: [R1](#R1)\n  ```mermaid\n  flowchart LR\n    Queue\n  ```\n";
    const fixed = applyFix(markdown, "untyped-node");
    expect(fixed).toContain('    Queue["Queue [container]"]');
  });

  it("softly flags a requirement that cites three different sources", () => {
    const markdown = golden.replace(
      '- **R5** Two staff on shifts share one desk computer — [Chat #10](#chat-msg-10 "We share the one computer at the desk.")',
      '- **R5** Two staff on shifts share one desk computer — [Chat #10](#chat-msg-10 "We share the one computer at the desk.") [Chat #2](#chat-msg-2 "paper book") [Brief](#cs "double bookings keep happening")',
    );
    expect(one(markdown, "many-sources")).toMatchObject({ severity: "info", message: "R5 may hold more than one idea." });
  });

  it("suggests the labelled fields for an old one-line decision", () => {
    const markdown = "## Decisions\n- **D1** One calendar — because [R1](#R1). Instead of: paper. Trade-off: staff online.\n";
    expect(one(markdown, "inline-format")).toMatchObject({ severity: "info", message: "Try the labelled fields for D1." });
    expect(rules(markdown)).not.toContain("no-alternative");
  });
});

describe("the Problems list", () => {
  it("puts doc and diagram problems in one list, each on the line it is about", () => {
    const markdown = replaceLast(golden, 'SMS["SMS confirmation [external]"]', 'SMS["SMS confirmation"]')
      .replace("  - Instead of: staff check the calendar by eye before saving\n", "")
      .replace('Desk -->|"request slot"| Calendar[("Shared booking calendar [datastore]")]\n  Calendar -->|"slot taken: refuse"| Desk\n  Calendar -->|"sends', 'Desk -->|"request slot"| Calendar[("Shared booking calendar [datastore]")]\n  Calendar -->|"slot taken: refuse"| Desk\n  Desk --> Printer["Printer [external]"]\n  Calendar -->|"sends');
    const doc = parseDesignDoc(markdown, extractFinalDiagram(markdown), BRIEF, GOLDEN_TRANSCRIPT);
    const problems = buildProblems({ markdown, doc, lint: lintDesignDoc(doc, markdown), consistency: checkConsistency(doc) });
    const lines = markdown.split("\n");
    expect(problems.map((problem) => [problem.rule, problem.source])).toEqual([
      ["no-alternative", "doc"],
      ["unlabelled-arrow", "diagram"],
      ["C3", "diagram"],
      ["C4", "diagram"],
      ["untyped-node", "diagram"],
    ]);
    expect(lines[problems[2].line - 1]).toContain("Printer");
    expect(problems[2].nodeId).toBe("Printer");
  });
});
