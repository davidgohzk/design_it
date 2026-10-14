import { useCallback, useMemo, useRef, useState } from "react";
import { streamText } from "../../lib/api";
import type { ResponseMeta } from "../../lib/api";
import { chatRequestMessages, finishReply, messageTimesOf } from "../../lib/chat";
import { FAILED_REPLY_PREFIX } from "../../../assessment/session";
import type { ChatMessage } from "../../lib/types";

/**
 * Chat with a case's client persona in structured mode: each reply arrives with the facts it states.
 * messageTimes[i] is messages[i].ts, or when the page loaded for seeded messages without one.
 */
export function useCaseChat({
  caseId,
  openingMessage,
  initialMessages,
  onMeta,
  onUserMessage,
}: {
  caseId: string;
  openingMessage: string;
  /** A prepopulated transcript; defaults to just the client's opening message. */
  initialMessages?: ChatMessage[];
  onMeta?: (meta: ResponseMeta) => void;
  onUserMessage?: (text: string) => void;
}) {
  const [loadedAt] = useState(() => Date.now());
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialMessages ?? [{ role: "assistant", content: openingMessage, ts: loadedAt }],
  );
  const [isSending, setIsSending] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const updateLast = useCallback((update: (message: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next.length - 1;
      if (last >= 0 && next[last].role === "assistant") next[last] = update(next[last]);
      return next;
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (isSending) return;
      onUserMessage?.(text);
      const userMessage: ChatMessage = { role: "user", content: text, ts: Date.now() };
      const history = [...messagesRef.current, userMessage];
      setMessages([...history, { role: "assistant", content: "" }]);
      setIsSending(true);
      try {
        await streamText(
          "/api/chat",
          { caseId, structured: true, messages: chatRequestMessages(history) },
          {
            onDelta: (part) => updateLast((message) => ({ ...message, content: message.content + part })),
            onDone: (meta) => {
              updateLast((message) => finishReply(message, meta, Date.now()));
              onMeta?.(meta);
            },
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        updateLast(() => ({ role: "assistant", content: `${FAILED_REPLY_PREFIX} ${message}`, ts: Date.now() }));
      } finally {
        setIsSending(false);
      }
    },
    [caseId, isSending, onMeta, onUserMessage, updateLast],
  );

  const messageTimes = useMemo(() => messageTimesOf(messages, loadedAt), [loadedAt, messages]);

  return { messages, messageTimes, isSending, send };
}
