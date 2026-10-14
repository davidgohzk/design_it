// WP13: the shell renders in each mode, every state carries an icon, and scored modes show no
// Keep / Justify / Fit result before Submit.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MODE_LABEL } from "../../../assessment/types";
import type { SessionMode } from "../../../assessment/types";
import { nodeBadges } from "../../../designDoc/legend";
import type { Problem } from "../../../designDoc/problems";
import { COMMUNITY_ROOM_CASE } from "../../../cases/community-room";
import { COMMUNITY_ROOM_SEED } from "../../../cases/community-room.seed";
import { parseDesignDoc } from "../../../designDoc/parse";
import { FinalDiagramPanel } from "../panels/FinalDiagramPanel";
import { ShortcutTable } from "./ShortcutSheet";
import { StatusBar } from "./StatusBar";
import { TopBar } from "./TopBar";
import { SHORTCUTS, countdownLabel, opensShortcutSheet } from "./shortcuts";
import { WARM_UP_TOUR } from "./tour";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ");

const problems: Problem[] = [
  { severity: "error", line: 3, message: "D1's sketch: broken", source: "diagram", itemId: "D1", rule: "mermaid" },
  { severity: "warning", line: 5, message: "D2 has no trade-off.", source: "doc", itemId: "D2", rule: "no-trade-off" },
  { severity: "info", line: 7, message: "Try the labelled fields for D3.", source: "doc", itemId: "D3", rule: "inline-format" },
];

const topBar = (mode: SessionMode, msLeft: number | null, submit = true) =>
  text(
    renderToStaticMarkup(
      <TopBar
        title="Community Room Booking"
        mode={mode}
        msLeft={msLeft}
        theme="light"
        onThemeChange={() => {}}
        onHome={() => {}}
        onShortcuts={() => {}}
        submit={submit ? { label: mode === "practice" ? "Review" : "Submit", disabled: false, onClick: () => {} } : undefined}
      />,
    ),
  );

describe("top bar", () => {
  it("shows the case, the mode and the Submit button", () => {
    for (const mode of ["practice", "assessment", "research"] as const) {
      const html = topBar(mode, mode === "practice" ? null : 25 * 60_000);
      expect(html).toContain("Community Room Booking");
      expect(html).toContain(MODE_LABEL[mode]);
      expect(html).toContain(mode === "practice" ? "Review" : "Submit");
    }
  });

  it("counts down only when there is a time cap, and warns in the last five minutes", () => {
    expect(topBar("practice", null)).not.toContain("⏱");
    expect(topBar("assessment", 25 * 60_000)).toContain("25:00");
    expect(renderToStaticMarkup(<TopBar title="t" mode="research" msLeft={4 * 60_000} theme="light" onThemeChange={() => {}} onHome={() => {}} onShortcuts={() => {}} />)).toContain("countdown low");
    expect(countdownLabel(90_500)).toBe("01:31");
    expect(countdownLabel(-5)).toBe("00:00");
    expect(countdownLabel(null)).toBeNull();
  });

  it("hides Submit once the work is submitted", () => {
    expect(topBar("assessment", 60_000, false)).not.toContain("Submit");
  });
});

describe("status bar", () => {
  it("counts problems with an icon each, and shows the time left and the save state", () => {
    const html = text(renderToStaticMarkup(<StatusBar problems={problems} msLeft={8 * 60_000} saved onProblems={() => {}} />));
    expect(html).toContain("✗ 1");
    expect(html).toContain("⚠ 1");
    expect(html).toContain("ℹ 1");
    expect(html).toContain("08:00 left");
    expect(html).toContain("✓ Saved");
    expect(text(renderToStaticMarkup(<StatusBar problems={[]} msLeft={null} saved={false} onProblems={() => {}} />))).toContain("… Saving");
  });
});

describe("shortcut sheet", () => {
  it("lists every shortcut the workspace has", () => {
    const html = text(renderToStaticMarkup(<ShortcutTable />));
    for (const shortcut of SHORTCUTS) {
      expect(html).toContain(shortcut.keys);
      expect(html).toContain(shortcut.action);
    }
    expect(SHORTCUTS).toHaveLength(8);
  });

  it('opens on "?" outside a text box only', () => {
    expect(opensShortcutSheet({ key: "?" })).toBe(true);
    expect(opensShortcutSheet({ key: "?", target: { tagName: "BODY", closest: () => null } })).toBe(true);
    expect(opensShortcutSheet({ key: "?", target: { tagName: "INPUT" } })).toBe(false);
    expect(opensShortcutSheet({ key: "?", target: { tagName: "TEXTAREA" } })).toBe(false);
    expect(opensShortcutSheet({ key: "?", target: { tagName: "DIV", isContentEditable: true } })).toBe(false);
    // The doc editor is a CodeMirror contenteditable inside .cm-editor.
    expect(opensShortcutSheet({ key: "?", target: { tagName: "DIV", closest: (selector) => (selector === ".cm-editor" ? {} : null) } })).toBe(false);
    expect(opensShortcutSheet({ key: "?", ctrlKey: true })).toBe(false);
    expect(opensShortcutSheet({ key: "a" })).toBe(false);
  });
});

describe("final diagram pane", () => {
  const seed = COMMUNITY_ROOM_SEED;
  const doc = parseDesignDoc(seed.docMarkdown, seed.finalCode, COMMUNITY_ROOM_CASE.briefMarkdown, seed.messages);

  it("builds a legend from the node types and badges each box with its decisions", () => {
    const html = text(renderToStaticMarkup(<FinalDiagramPanel doc={doc} finalCode={seed.finalCode} problems={[]} />));
    expect(html).toContain("Legend");
    expect(html).toContain("Person (2)");
    expect(html).toContain("Datastore (1)");
    // The flawed sample's Message queue and Printer have no type yet.
    expect(html).toContain("No type yet (2)");
    expect(html).toContain("D2");
    // The printed schedule is in no sketch (C3); people don't need a decision behind them.
    expect(html).toContain("⚠ no decision");
    expect(html).toContain("person");
    const badges = nodeBadges(doc);
    expect(badges.find((badge) => badge.nodeId === "Printer")?.unexplained).toBe(true);
    expect(badges.find((badge) => badge.nodeId === "Resident")).toMatchObject({ decisionIds: [], unexplained: false });
  });

  it("shows the diagram's problems, and says so when there is no diagram", () => {
    const html = text(renderToStaticMarkup(<FinalDiagramPanel doc={doc} finalCode={seed.finalCode} problems={problems.slice(0, 1)} />));
    expect(html).toContain("D1's sketch: broken");
    const empty = parseDesignDoc("## Requirements\n- **R1** x\n", "", COMMUNITY_ROOM_CASE.briefMarkdown, []);
    expect(text(renderToStaticMarkup(<FinalDiagramPanel doc={empty} finalCode="" problems={[]} />))).toContain("No final diagram yet");
  });
});

describe("the guided tour", () => {
  it("covers Cite, #, Problems, the palette and Submit, in about five stops", () => {
    expect(WARM_UP_TOUR).toHaveLength(5);
    const all = WARM_UP_TOUR.map((stop) => `${stop.title} ${stop.body}`).join(" ");
    for (const topic of ["Cite", "#", "Problems", "Ctrl/Cmd + Shift + P", "Submit"]) expect(all).toContain(topic);
  });
});
