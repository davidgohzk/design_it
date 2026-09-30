import { Button, Typography } from "@mui/material";
import type { FinalTurn } from "./useDesignWorkspace";

const SOURCE_LABEL: Record<FinalTurn["source"], string> = {
  ai: "AI",
  merge: "Built from sketches",
  manual: "Edited by hand",
  seed: "Prepopulated example",
};

/** Admin view: step through the final diagram's history. */
export function FinalHistoryStepper({
  history,
  index,
  onChange,
}: {
  history: FinalTurn[];
  index: number;
  onChange: (index: number) => void;
}) {
  const turn = history[index];
  return (
    <div className="design-section design-input">
      <div className="design-stepper">
        <Button size="small" variant="outlined" disabled={index <= 0} onClick={() => onChange(index - 1)}>
          ←
        </Button>
        <Typography variant="caption" color="text.secondary">
          {history.length ? `Turn ${index + 1} / ${history.length} · ${SOURCE_LABEL[turn.source]}` : "No turns yet"}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={index >= history.length - 1}
          onClick={() => onChange(index + 1)}
        >
          →
        </Button>
      </div>
      {turn?.prompt && <div className="design-prompt-readout">{turn.prompt}</div>}
    </div>
  );
}
