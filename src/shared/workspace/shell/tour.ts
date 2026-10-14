export type TourStop = { selector: string; title: string; body: string };

/** The warm-up tour: the five things an engineer needs before they start (about 2 minutes). */
export const WARM_UP_TOUR: readonly TourStop[] = [
  {
    selector: ".slack-message.assistant .bubble-actions",
    title: "Cite what the client said",
    body: "Hover a message for Cite, or select any part of a reply. The quote lands in your doc and is checked against the chat.",
  },
  {
    selector: ".doc-code-editor",
    title: "# references your own items",
    body: "Type # to link an R#, A# or D#. Ctrl/Cmd + click a reference to jump to it; hover it to read it.",
  },
  {
    selector: ".problems-panel",
    title: "Problems",
    body: "Format and diagram checks live here while you write. Click one to jump to it; Ctrl/Cmd + . offers a quick fix.",
  },
  {
    selector: ".app-topbar",
    title: "Command palette",
    body: "Ctrl/Cmd + Shift + P (or / on an empty line) inserts a new requirement, assumption or decision. Press ? for every shortcut.",
  },
  {
    selector: ".app-topbar-actions",
    title: "Submit when you're done",
    body: "Submit locks your work and walks you through a few situations your design has to handle. Then you get your review.",
  },
];

const STORAGE_KEY = "design_it.tourDone";

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberTour() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage can be blocked; the tour will offer itself again next time.
  }
}
