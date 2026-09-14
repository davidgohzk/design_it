import OpenAI from "openai";

export const createAIClient = (apiKey: string) =>
  new OpenAI({
    apiKey: apiKey.trim(),
    // Dev routes through the Vite proxy because the gateway sends no CORS headers.
    baseURL: import.meta.env.DEV
      ? new URL("/api/soclaas/v1", window.location.origin).toString()
      : import.meta.env.VITE_SOCLAAS_BASE_URL,
    dangerouslyAllowBrowser: true,
  });
