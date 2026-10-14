import { Button, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import { MODE_LABEL } from "../../../assessment/types";
import type { SessionMode } from "../../../assessment/types";
import type { ThemeMode } from "../../lib/theme";
import { countdownLabel } from "./shortcuts";

type TopBarProps = {
  title: string;
  mode: SessionMode;
  /** ms left before the time cap, or null when there is none (practice). */
  msLeft: number | null;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onHome: () => void;
  onShortcuts: () => void;
  /** The green "Create pull request"-style button; hidden once the work is submitted. */
  submit?: { label: string; disabled: boolean; onClick: () => void };
  children?: React.ReactNode;
};

/** The top bar, as in VS Code / GitHub: where you are, the mode, the countdown and Submit. */
export function TopBar({ title, mode, msLeft, theme, onThemeChange, onHome, onShortcuts, submit, children }: TopBarProps) {
  const left = countdownLabel(msLeft);
  const low = msLeft !== null && msLeft <= 5 * 60_000;
  return (
    <header className="app-topbar">
      <button className="demo-back-btn" onClick={onHome} aria-label="Back to home page">
        ← Back to Home
      </button>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title} <Chip size="small" label={MODE_LABEL[mode]} sx={{ ml: 1, verticalAlign: "middle" }} />
      </Typography>
      <div className="app-topbar-actions">
        {left && (
          <span className={`countdown ${low ? "low" : ""}`} role="timer" aria-label={`${left} left`} title="Time left">
            ⏱ {left}
          </span>
        )}
        {children}
        <Tooltip title="Keyboard shortcuts (?)">
          <IconButton size="small" onClick={onShortcuts} aria-label="Keyboard shortcuts">
            ?
          </IconButton>
        </Tooltip>
        <Tooltip title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
          <IconButton size="small" onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? "☀" : "☾"}
          </IconButton>
        </Tooltip>
        {submit && (
          <Button size="small" variant="contained" color="success" onClick={submit.onClick} disabled={submit.disabled}>
            {submit.label}
          </Button>
        )}
      </div>
    </header>
  );
}
