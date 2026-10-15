import { ROW_ICON } from "../../../../assessment/reportModel";
import type { AssessmentResult } from "../../../../assessment/types";
import { MethodPill } from "../MethodPill";

/**
 * Gate: was this a fair session? Everyone sees whether the session was complete and what was left out
 * of their scores, because that changes how to read the rest. The audit rows — leaks, phantoms,
 * invented specifics — are for the research admin, not the engineer.
 */
export function GateBody({ result, showDetails }: { result: AssessmentResult; showDetails: boolean }) {
  const { gate } = result;
  return (
    <ul className="test-rows">
      <li>
        {ROW_ICON[gate.sessionComplete ? "pass" : "fail"]} Session complete: {gate.sessionComplete ? "yes" : "no"}
        {gate.failedReplies.length ? ` (failed replies: ${gate.failedReplies.map((index) => `#${index}`).join(", ")})` : ""} <MethodPill method="code" />
      </li>
      <li>
        {ROW_ICON[gate.clientFailed.length ? "skipped" : "pass"]} Facts left out because the client didn't answer: {gate.clientFailed.length}
        {gate.clientFailed.length ? ` — ${gate.clientFailed.map((failure) => `${failure.factId} (Chat #${failure.messageIndex})`).join(", ")}` : ""}
      </li>
      {showDetails && (
        <>
          <li>
            {ROW_ICON[gate.leaks.length ? "warn" : "pass"]} Leaks: {gate.leaks.length}; phantoms: {gate.phantoms.length}{" "}
            {[...gate.leaks, ...gate.phantoms].map((item) => `${item.factId} (#${item.messageIndex})`).join(", ")}
          </li>
          <li>
            {ROW_ICON[gate.inventedSpecifics.length ? "warn" : "pass"]} Invented specifics, for a human to audit:{" "}
            {gate.inventedSpecifics.length ? gate.inventedSpecifics.map((item) => `“${item.text}” (#${item.messageIndex})`).join(", ") : "none"}
          </li>
        </>
      )}
    </ul>
  );
}
