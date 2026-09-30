import { useCallback, useRef, useState } from "react";
import { streamText } from "../../lib/api";
import type { ResponseMeta } from "../../lib/api";
import { FAILED_REPLY_PREFIX } from "../../../assessment/session";
import type { ChatMessage } from "../../lib/types";

/** Chat with a case's client persona. messageTimes[i] is when messages[i] was sent or started streaming. */
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
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialMessages ?? [{ role: "assistant", content: openingMessage }],
  );
  const [messageTimes, setMessageTimes] = useState<number[]>(() => {
    const now = Date.now();
    return (initialMessages ?? [null]).map(() => now);
  });
  const [isSending, setIsSending] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const updateLast = useCallback((update: (content: string) => string) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next.length - 1;
      if (last >= 0 && next[last].role === "assistant") {
        next[last] = { ...next[last], content: update(next[last].content) };
      }
      return next;
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (isSending) return;
      onUserMessage?.(text);
      const userMessage: ChatMessage = { role: "user", content: text };
      const history = [...messagesRef.current, userMessage];
      const now = Date.now();
      setMessages([...history, { role: "assistant", content: "" }]);
      setMessageTimes((prev) => [...prev, now, now]);
      setIsSending(true);
      try {
        await streamText(
          "/api/chat",
          { caseId, messages: history },
          { onDelta: (part) => updateLast((content) => content + part), onDone: onMeta },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        updateLast(() => `${FAILED_REPLY_PREFIX} ${message}`);
      } finally {
        setIsSending(false);
      }
    },
    [caseId, isSending, onMeta, onUserMessage, updateLast],
  );

  return { messages, messageTimes, isSending, send };
}
