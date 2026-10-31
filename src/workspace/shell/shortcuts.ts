// The whole shortcut set (WP13). The `?` sheet shows exactly this list, so it stays short.

export type Shortcut = { keys: string; action: string; sameAs: string };

export const SHORTCUTS: readonly Shortcut[] = [
  { keys: "Enter / Shift+Enter", action: "Send message / new line in chat", sameAs: "Slack" },
  { keys: "Ctrl/Cmd + Shift + P", action: "Command palette", sameAs: "VS Code" },
  { keys: "/ on an empty line", action: "Insert template", sameAs: "Notion, Slack" },
  { keys: "#", action: "Reference autocomplete", sameAs: "GitHub" },
  { keys: "Ctrl/Cmd + click", action: "Go to R#, A# or D#", sameAs: "VS Code" },
  { keys: "Ctrl/Cmd + .", action: "Quick fix", sameAs: "VS Code" },
  { keys: "Ctrl/Cmd + Shift + M", action: "Toggle Problems panel", sameAs: "VS Code" },
  { keys: "?", action: "Show this shortcut sheet", sameAs: "GitHub" },
];

/** Only what the `?` rule needs from a keystroke, so it can be checked without a browser. */
export type KeyLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean; closest?: (selector: string) => unknown } | null;
};

/** True when a keystroke should open the `?` sheet: "?" typed outside a text box. */
export function opensShortcutSheet(event: KeyLike): boolean {
  if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey) return false;
  const target = event.target;
  if (!target?.tagName) return true;
  if (target.isContentEditable) return false;
  const tag = target.tagName.toUpperCase();
  return tag !== "INPUT" && tag !== "TEXTAREA" && !target.closest?.(".cm-editor");
}

/** "24:05" left of a countdown, or null when there is no time cap. */
export function countdownLabel(msLeft: number | null): string | null {
  if (msLeft === null) return null;
  const left = Math.max(0, Math.round(msLeft / 1000));
  return `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
}
