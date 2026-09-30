import type { ReactNode } from "react";
import { Tooltip } from "@mui/material";
import { itemRefClass, useReferences } from "./references";

/** An inline R#/A#/D# link; hover shows the item's words. */
export function ItemLink({ id, onItem, children }: { id: string; onItem?: (id: string) => void; children?: ReactNode }) {
  const text = useReferences().item(id);
  const chip = (
    <span className={itemRefClass(id)} role="link" tabIndex={0} onClick={() => onItem?.(id)}>
      {children}
    </span>
  );
  return text ? (
    <Tooltip
      title={
        <>
          <strong>{id}</strong> {text}
        </>
      }
      arrow
      placement="top"
    >
      {chip}
    </Tooltip>
  ) : (
    chip
  );
}
