import { streamText } from "../../lib/api";
import type { ResponseMeta } from "../../lib/api";
import { mermaidError, stripMermaidFences } from "../../../designDoc/validate";

const MAX_ATTEMPTS = 2;

/**
 * Asks /api/diagram for Mermaid and checks it with mermaid.parse.
 * A diagram that doesn't parse is sent back once with its error, so the AI can correct it.
 */
export async function generateDiagram({
  prompt,
  currentCode,
  context,
  onDelta,
}: {
  prompt: string;
  currentCode: string | null;
  context?: string;
  onDelta?: (text: string) => void;
}): Promise<{ code: string; meta: ResponseMeta }> {
  let priorAttempt: { code: string; error: string } | null = null;
  let lastError = "The diagram didn't parse.";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let raw = "";
    let meta: ResponseMeta = {};
    await streamText(
      "/api/diagram",
      { prompt, currentCode: currentCode || null, context: context ?? null, priorAttempt },
      {
        onDelta: (part) => {
          raw += part;
          onDelta?.(raw);
        },
        onDone: (received) => {
          meta = received;
        },
      },
    );
    const code = stripMermaidFences(raw);
    const error = code ? await mermaidError(code) : "The AI returned an empty diagram.";
    if (!error) return { code, meta };
    lastError = error;
    priorAttempt = code ? { code, error } : null;
  }
  throw new Error(`The AI's diagram didn't parse: ${lastError}`);
}
