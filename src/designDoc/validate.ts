// Pure Mermaid checks. mermaid.parse needs a DOM, so the React hook that debounces it lives in the
// workspace (@/workspace/hooks/useMermaidErrors), keeping this area free of React.
import mermaid from "@/lib/mermaid";

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
