import { Typography } from "@mui/material";
import { processAdvice } from "../../../assessment/reportModel";
import type { AssessmentResult, SessionMode } from "../../../assessment/types";
import { QUESTION_TAGS } from "../../../assessment/questionTags";
import type { ChatMessage, TimelineEntry } from "../../lib/types";
import { MethodPill } from "./MethodPill";

type ActivityTabProps = {
  result: AssessmentResult;
  messages: ChatMessage[];
  timeline: TimelineEntry[];
  mode: SessionMode;
  /** Admin view: numbers instead of advice. */
  showNumbers: boolean;
  timeOnTaskMs?: number;
  diagramPrompts?: number;
};

type Event = { at: number; kind: string; text: string; tags?: string[]; index?: number };

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const minutes = (ms: number) => `${Math.round(ms / 60000)} min`;

/** The session as a GitHub PR timeline: messages (with their tags), citations, decisions added, AI prompts. */
export function ActivityTab({ result, messages, timeline, mode, showNumbers, timeOnTaskMs, diagramPrompts }: ActivityTabProps) {
  const tagsByIndex = new Map(result.process.tags.map((entry) => [entry.messageIndex, entry.tags]));
  const events: Event[] = [];
  messages.forEach((message, index) => {
    if (message.role !== "user" || message.ts === undefined) return;
    events.push({ at: message.ts, kind: "message", text: message.content, tags: tagsByIndex.get(index), index });
  });
  for (const entry of timeline) {
    if (entry.type === "quote") events.push({ at: entry.at, kind: "citation", text: `Cited ${entry.summary}: “${entry.detail}”` });
    else if (entry.type === "editor") {
      const added = [...(entry.diff ?? "").matchAll(/^\+- \*\*([RAD]\d+)\*\*/gm)].map((match) => match[1]);
      if (added.length) events.push({ at: entry.at, kind: "edit", text: `Added ${added.join(", ")}` });
    } else if (entry.type === "design") events.push({ at: entry.at, kind: "ai", text: `${entry.summary}${entry.detail ? `: ${entry.detail}` : ""}` });
    else if (entry.type === "chat" && entry.summary.startsWith("Interview ended")) events.push({ at: entry.at, kind: "stop", text: `${entry.summary}${entry.detail ? `: “${entry.detail}”` : ""}` });
  }
  events.sort((a, b) => a.at - b.at);
  const { counts, stopReason, stopBucket } = result.process;
  const questions = result.process.tags.length;

  return (
    <div className="activity-tab">
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{questions}</span>
          <span className="stat-label">questions asked</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{result.ask.timeToFirstProbeSec !== undefined ? `${Math.round(result.ask.timeToFirstProbeSec / 60)} min` : "—"}</span>
          <span className="stat-label">to the first follow-up probe</span>
        </div>
        {timeOnTaskMs !== undefined && (
          <div className="stat-card">
            <span className="stat-value">{minutes(timeOnTaskMs)}</span>
            <span className="stat-label">time on task</span>
          </div>
        )}
        {diagramPrompts !== undefined && (
          <div className="stat-card">
            <span className="stat-value">{diagramPrompts}</span>
            <span className="stat-label">diagram helper prompts</span>
          </div>
        )}
        <div className="stat-card">
          <span className="stat-value">{stopBucket ? stopBucket.replace(/_/g, " ") : "—"}</span>
          <span className="stat-label">why you stopped{stopReason ? `: “${stopReason}”` : ""}</span>
        </div>
      </div>

      {showNumbers ? (
        <table className="tag-counts">
          <caption>
            How you worked (rules only, not scored) <MethodPill method="code" />
          </caption>
          <tbody>
            {QUESTION_TAGS.map((tag) => (
              <tr key={tag}>
                <th scope="row">{tag.replace(/_/g, " ")}</th>
                <td>{counts[tag] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        mode === "practice" && (
          <section className="advice">
            <Typography variant="subtitle2">How you worked (teaching only, not scored)</Typography>
            <ul>
              {processAdvice(result).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )
      )}

      <ol className="pr-timeline">
        {events.length === 0 && <li className="pr-event">No timed activity was recorded for this session.</li>}
        {events.map((event, position) => (
          <li key={`${event.at}-${position}`} className={`pr-event ${event.kind}`}>
            <span className="pr-time">{clock(event.at)}</span>
            <span className="pr-text">
              {event.index !== undefined && <span className="slack-permalink">#{event.index} </span>}
              {event.text}
            </span>
            {event.tags?.map((tag) => (
              <span key={tag} className="tag-label">
                {tag.replace(/_/g, " ")}
              </span>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}
