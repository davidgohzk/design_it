// mermaid.parse needs a DOM, so it runs here in the UI and not in the pure parser.
import { useEffect, useState } from "react";
import mermaid from "../shared/lib/mermaid";

export const stripMermaidFences = (text: string) =>
  text
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

/** Resolves to Mermaid's own error message, or null when the code parses. */
export async function mermaidError(code: string): Promise<string | null> {
  try {
    await mermaid.parse(code);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "The diagram doesn't parse.";
  }
}

/**
 * Debounced mermaid.parse for a set of named blocks (e.g. { D1: "...", final: "..." }).
 * Returns the Mermaid error per block name; blocks that parse are absent.
 */
export function useMermaidErrors(blocks: Record<string, string>, delayMs = 400) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = JSON.stringify(blocks);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const entries = Object.entries(JSON.parse(key) as Record<string, string>);
      const results = await Promise.all(
        entries.map(async ([name, code]) => [name, code.trim() ? await mermaidError(code) : null] as const),
      );
      if (cancelled) return;
      setErrors(Object.fromEntries(results.filter((entry): entry is [string, string] => entry[1] !== null)));
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, delayMs]);

  return errors;
}
