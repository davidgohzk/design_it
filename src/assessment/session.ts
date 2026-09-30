// Level 0 "session completed" (a log check): a timed-out or crashed client reply makes scores meaningless.
import type { ChatMessage } from "../shared/lib/types";

/** What useCaseChat writes into the client's reply when the request fails. */
export const FAILED_REPLY_PREFIX = "Request failed:";

export type SessionCompletion = {
  completed: boolean;
  /** Indexes of client replies that are empty or failed. */
  failedReplies: number[];
};

export function sessionCompletion(messages: ChatMessage[]): SessionCompletion {
  const failedReplies = messages.flatMap((message, index) =>
    message.role === "assistant" && (!message.content.trim() || message.content.startsWith(FAILED_REPLY_PREFIX))
      ? [index]
      : [],
  );
  return { completed: failedReplies.length === 0, failedReplies };
}
