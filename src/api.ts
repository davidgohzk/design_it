// Client for design_it_backend. The backend owns the prompts, model and SoCLaaS key;
// a key typed into the toolbar is sent per request as an optional override.

const DEFAULT_API_BASE_URL = "https://design-it.onrender.com";
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
export const API_BASE_URL = configuredBaseUrl || DEFAULT_API_BASE_URL;

const KEY_HEADER = "X-SoCLaaS-Key";
const WAKING_UP_HINT = "The server may be waking up (free hosting can take up to a minute). Please retry.";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type SseEvent = {
  name: string;
  data: { delta?: string; code?: string; message?: string };
};

const buildHeaders = (apiKey?: string) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = apiKey?.trim();
  if (key) headers[KEY_HEADER] = key;
  return headers;
};

const timeoutError = () =>
  new ApiError(`The server took too long to respond. ${WAKING_UP_HINT}`, 0, "timeout");

async function toApiError(response: Response) {
  let code = "http_error";
  let message = `Request failed with status ${response.status}.`;
  try {
    const body = await response.json();
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    // Non-JSON error body (e.g. a proxy page); keep the generic message.
  }
  if (code === "invalid_user_key") {
    message = "SoCLaaS rejected the API key you entered. Clear the key field to use the server's key.";
  }
  const retryAfter = Number(response.headers.get("Retry-After"));
  if (response.status === 429 && retryAfter > 0) {
    message = `Too many requests. Try again in ${retryAfter}s.`;
  }
  return new ApiError(message, response.status, code);
}

async function post(path: string, body: unknown, apiKey: string | undefined, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (signal.aborted) throw timeoutError();
    throw new ApiError(`Could not reach the server. ${WAKING_UP_HINT}`, 0, "network");
  }
  if (!response.ok) throw await toApiError(response);
  return response;
}

export async function postJson<T>(
  path: string,
  body: unknown,
  { apiKey, timeoutMs = 240_000 }: { apiKey?: string; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await post(path, body, apiKey, controller.signal);
    return (await response.json()) as T;
  } catch (error) {
    if (controller.signal.aborted && !(error instanceof ApiError)) throw timeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const parseEvent = (block: string): SseEvent | null => {
  let name = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) name = line.slice("event:".length).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trimStart());
  }
  if (dataLines.length === 0) return null;
  try {
    return { name, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
};

/** POSTs to a streaming endpoint, calls onDelta for each text chunk, and resolves with the full text. */
export async function streamText(
  path: string,
  body: unknown,
  {
    apiKey,
    onDelta,
    firstByteTimeoutMs = 90_000,
    idleTimeoutMs = 60_000,
  }: {
    apiKey?: string;
    onDelta: (delta: string) => void;
    firstByteTimeoutMs?: number;
    idleTimeoutMs?: number;
  },
): Promise<string> {
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), firstByteTimeoutMs);
  const restartTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), idleTimeoutMs);
  };

  let text = "";
  try {
    const response = await post(path, body, apiKey, controller.signal);
    if (!response.body) throw new ApiError("The server returned an empty response.", response.status, "empty_response");
    restartTimer();

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      restartTimer();
      buffer += value;

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const event = parseEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
        if (!event) continue;
        if (event.name === "done") return text;
        if (event.name === "error") {
          throw new ApiError(
            event.data.message ?? "The AI response was interrupted. Please retry.",
            502,
            event.data.code ?? "stream_error",
          );
        }
        if (event.data.delta) {
          text += event.data.delta;
          onDelta(event.data.delta);
        }
      }
    }
    throw new ApiError("The response was cut off. Please retry.", 0, "stream_incomplete");
  } catch (error) {
    if (controller.signal.aborted && !(error instanceof ApiError)) throw timeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Free Render instances sleep when idle; a cheap ping starts waking the backend early. */
export const warmUpBackend = () =>
  fetch(`${API_BASE_URL}/health`).then(
    (response) => response.ok,
    () => false,
  );
