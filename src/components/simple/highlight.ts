import { flashElementClass, flashTextMatch } from "../../utils";

const FLASH_MS = 2500;

/** Scrolls to a chat message and flashes the quoted text in it (or the whole bubble). */
export function flashChatMessage(index: number, text?: string) {
  const bubble = document.getElementById(`chat-msg-${index}`);
  if (!bubble) return;
  bubble.scrollIntoView({ behavior: "smooth", block: "center" });
  const cleanup = text ? flashTextMatch(bubble, text, "chat-text-highlight") : null;
  if (!cleanup) bubble.classList.add("quote-highlight");
  setTimeout(() => {
    cleanup?.();
    bubble.classList.remove("quote-highlight");
  }, FLASH_MS);
}

/** Flashes a quoted excerpt inside a container, falling back to the whole container. */
export function flashTextIn(container: HTMLElement | null, text: string) {
  if (!container) return;
  const cleanup =
    flashTextMatch(container, text, "cs-text-highlight") ??
    flashElementClass(container, "context-panel-highlight");
  setTimeout(cleanup, FLASH_MS);
}

/** Scrolls to an element by id and flashes it. */
export function flashElementById(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  setTimeout(flashElementClass(element, "simple-flash"), FLASH_MS);
}
