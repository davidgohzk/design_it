import type { ResponseMeta } from "./api";
import type { ChatMessage } from "./types";

/** The conversation as /api/chat takes it: role and text, plus the fact ids the server gave each client turn. */
export const chatRequestMessages = (messages: ChatMessage[]) =>
  messages.map(({ role, content, disclosedFactIds }) =>
    role === "assistant" && disclosedFactIds ? { role, content, disclosedFactIds } : { role, content },
  );

/** A finished client reply: its text plus what the server's `done` event said about it. */
export const finishReply = (message: ChatMessage, meta: ResponseMeta, at: number): ChatMessage => ({
  ...message,
  ts: at,
  ...(meta.disclosedFactIds ? { disclosedFactIds: meta.disclosedFactIds } : {}),
  ...(meta.guard ? { guard: meta.guard } : {}),
  ...(meta.model ? { model: meta.model } : {}),
});

/** When each message happened; messages without a time (seeded examples) use `fallback`. */
export const messageTimesOf = (messages: ChatMessage[], fallback: number) =>
  messages.map((message) => message.ts ?? fallback);
