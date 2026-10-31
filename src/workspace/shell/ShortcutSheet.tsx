import { Dialog, DialogContent, DialogTitle, Typography } from "@mui/material";
import { SHORTCUTS } from "./shortcuts";

/** Every shortcut the workspace has, and nothing else. */
export function ShortcutTable() {
  return (
    <table className="shortcut-sheet">
      <tbody>
        {SHORTCUTS.map((shortcut) => (
          <tr key={shortcut.keys}>
            <th scope="row">
              <kbd>{shortcut.keys}</kbd>
            </th>
            <td>{shortcut.action}</td>
            <td className="shortcut-same">as in {shortcut.sameAs}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The `?` sheet, as on GitHub. */
export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Keyboard shortcuts</DialogTitle>
      <DialogContent>
        <ShortcutTable />
        <Typography variant="caption" color="text.secondary">
          Press Esc to close.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
