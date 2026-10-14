import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Dialog, InputBase, List, ListItemButton, ListItemText, Typography } from "@mui/material";

export type PaletteCommand = { id: string; label: string; shortcut?: string; run: () => void };

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
};

/** Ctrl/Cmd + Shift + P: type to filter, arrows to move, Enter to run, Esc to close (as in VS Code). */
export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { alignSelf: "flex-start", mt: 8 } } }}>
      {open && <PaletteBody commands={commands} onClose={onClose} />}
    </Dialog>
  );
}

function PaletteBody({ commands, onClose }: { commands: PaletteCommand[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The dialog's focus trap can land on the dialog itself; put the caret in the search box.
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return commands.filter((command) => words.every((word) => command.label.toLowerCase().includes(word)));
  }, [commands, query]);
  const selected = Math.min(active, Math.max(0, matches.length - 1));

  const run = (command: PaletteCommand | undefined) => {
    if (!command) return;
    onClose();
    // Let the dialog close and focus return before the command moves focus (e.g. into the editor).
    requestAnimationFrame(command.run);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((selected + 1) % Math.max(1, matches.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((selected - 1 + matches.length) % Math.max(1, matches.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(matches[selected]);
    }
  };

  return (
    <div className="command-palette" role="combobox" aria-expanded="true" aria-haspopup="listbox">
      <InputBase
        autoFocus
        inputRef={inputRef}
        fullWidth
        placeholder="Type a command"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        sx={{ px: 2, py: 1.25, borderBottom: "1px solid var(--panel-border)" }}
        inputProps={{ "aria-label": "Command" }}
      />
      <List dense role="listbox" sx={{ maxHeight: 320, overflow: "auto" }}>
        {matches.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
            No matching commands
          </Typography>
        )}
        {matches.map((command, index) => (
          <ListItemButton key={command.id} selected={index === selected} onClick={() => run(command)} role="option">
            <ListItemText primary={command.label} />
            {command.shortcut && (
              <Typography variant="caption" color="text.secondary">
                {command.shortcut}
              </Typography>
            )}
          </ListItemButton>
        ))}
      </List>
    </div>
  );
}
