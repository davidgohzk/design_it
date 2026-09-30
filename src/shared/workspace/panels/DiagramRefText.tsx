import type { ReactElement } from "react";
import { Tooltip } from "@mui/material";
import type { EdgeRef } from "../../../assessment/types";
import { BOX_REF_CLASS, useReferences } from "./references";

export type DiagramRefHandlers = {
  onNode: (nodeId: string) => void;
  onEdge: (edge: EdgeRef) => void;
};

/**
 * A check message with its `Box` and `From → To` code spans (as the consistency checks write them)
 * turned into buttons that show that box or connection on the diagram.
 */
export function DiagramRefText({ text, onNode, onEdge }: { text: string } & DiagramRefHandlers) {
  const refs = useReferences();
  const box = (id: string) => refs.box(id) ?? id;
  const withLabel = (part: string, label: string, chip: ReactElement) => (
    <Tooltip key={part} title={<><strong>{part}</strong> {label}</>} arrow placement="top">
      {chip}
    </Tooltip>
  );
  return (
    <>
      {text.split(/`([^`]+)`/).map((part, index) => {
        if (index % 2 === 0) return part;
        const edge = part.match(/^(\w+)\s*→\s*(\w+)$/);
        if (edge) {
          const ref = { from: edge[1], to: edge[2] };
          return withLabel(
            part,
            `${box(ref.from)} → ${box(ref.to)}`,
            <button type="button" className={BOX_REF_CLASS} onClick={() => onEdge(ref)}>
              {part}
            </button>,
          );
        }
        if (/^\w+$/.test(part)) {
          return withLabel(
            part,
            box(part),
            <button type="button" className={BOX_REF_CLASS} onClick={() => onNode(part)}>
              {part}
            </button>,
          );
        }
        return <code key={index}>{part}</code>;
      })}
    </>
  );
}
