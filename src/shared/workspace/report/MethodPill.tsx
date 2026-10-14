import { Tooltip } from "@mui/material";
import type { Method } from "../../../assessment/types";
import { METHOD_LABEL } from "../../../assessment/types";

const METHOD_TIP: Record<Method, string> = {
  code: "Worked out by code from your work; no AI involved.",
  ai_verified_quote: "Judged by AI, and kept only because its quotes were found word for word in your work.",
  ai_judgment: "An AI judgment without verified evidence, or runs that disagreed. Read it as a hint, not a result.",
};

/** How a number was made, as a GitHub-style label in a fixed colour. */
export function MethodPill({ method }: { method: Method }) {
  return (
    <Tooltip title={METHOD_TIP[method]} arrow>
      <span className={`method-pill method-${method}`} tabIndex={0}>
        {METHOD_LABEL[method]}
      </span>
    </Tooltip>
  );
}
