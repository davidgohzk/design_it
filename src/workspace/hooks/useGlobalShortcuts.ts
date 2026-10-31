import { useEffect } from "react";
import { opensShortcutSheet } from "../shell/shortcuts";
import type { KeyLike } from "../shell/shortcuts";

/**
 * The shortcuts that work anywhere on the page: Ctrl/Cmd + Shift + P, Ctrl/Cmd + Shift + M and "?".
 *
 * Inside the editor CodeMirror handles the first two itself and marks the event as handled, which
 * is why defaultPrevented is checked before acting.
 */
export function useGlobalShortcuts({
  onCommandPalette,
  onToggleProblems,
  onShortcutSheet,
}: {
  onCommandPalette: () => void;
  onToggleProblems: () => void;
  onShortcutSheet: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (opensShortcutSheet({ ...event, key: event.key, target: event.target as KeyLike["target"] })) {
        event.preventDefault();
        onShortcutSheet();
        return;
      }
      if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || !event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === "p") {
        event.preventDefault();
        onCommandPalette();
      } else if (key === "m") {
        event.preventDefault();
        onToggleProblems();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCommandPalette, onShortcutSheet, onToggleProblems]);
}
