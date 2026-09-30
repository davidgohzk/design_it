import type { ReactElement, ReactNode } from "react";
import { Tooltip } from "@mui/material";
import type { PieceCheck } from "../../../assessment/pieces";
import type { EdgeRef } from "../../../assessment/types";
import { BOX_REF_CLASS, itemRefClass, useReferences } from "../panels/references";
import { useLayerCollapse } from "./reportTypes";

/** How a number was produced (scoring rule 4): shown on every layer or cell. */
export type ReportMethod = "Code" | "Code · log check" | "Code · template" | "AI · verified quotes" | "AI judgment";

function Method({ method }: { method?: ReportMethod }) {
  return method ? <span className="report-method">{method}</span> : null;
}

/**
 * One level of the report: a full-width band whose checks sit side by side. Clicking its header folds
 * it away; folded content stays mounted (hidden), so its diagrams are ready when it opens again.
 */
export function ReportLayer({
  layerId,
  level,
  title,
  question,
  method,
  children,
}: {
  layerId: string;
  level: string;
  title: string;
  question: string;
  method?: ReportMethod;
  children: ReactNode;
}) {
  const collapse = useLayerCollapse();
  const open = collapse.isOpen(layerId);
  return (
    <section className={open ? "report-layer" : "report-layer is-collapsed"} id={`report-layer-${layerId}`}>
      <header className="report-layer-header">
        <button
          type="button"
          className="report-layer-toggle"
          aria-expanded={open}
          onClick={() => collapse.toggle(layerId)}
          title={open ? "Hide this level" : "Show this level"}
        >
          <span className="report-layer-chevron" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
          <span className="report-layer-badge">{level}</span>
          <span className="report-layer-heading">
            <span className="report-layer-title">{title}</span>
            {open && <span className="report-layer-question">{question}</span>}
          </span>
        </button>
        <Method method={method} />
      </header>
      <div hidden={!open}>{children}</div>
    </section>
  );
}

export function LayerCols({ columns = 3, children }: { columns?: 2 | 3; children: ReactNode }) {
  return <div className={columns === 2 ? "report-layer-cols is-two" : "report-layer-cols"}>{children}</div>;
}

export function LayerCell({
  title,
  subtitle,
  method,
  children,
}: {
  title: string;
  subtitle?: string;
  method?: ReportMethod;
  children: ReactNode;
}) {
  return (
    <div className="report-cell">
      <div className="report-cell-header">
        <h4 className="report-cell-title">{title}</h4>
        <Method method={method} />
      </div>
      {subtitle && <div className="report-cell-subtitle">{subtitle}</div>}
      {children}
    </div>
  );
}

/** A pass / fail / not-measured line, with the failing items as reference chips. */
export function CheckRow({
  label,
  state,
  failing = [],
  detail,
  renderRef,
}: {
  label: ReactNode;
  state: "pass" | "fail" | "na";
  failing?: string[];
  detail?: ReactNode;
  renderRef?: (id: string) => ReactNode;
}) {
  return (
    <div className="report-check">
      <span className={`report-check-mark is-${state}`} aria-label={state === "na" ? "not measured" : state}>
        {state === "pass" ? "✓" : state === "fail" ? "✗" : "–"}
      </span>
      <div className="report-row-main">
        <span className="report-row-title">{label}</span>
        {failing.length > 0 && (
          <div className="report-ref-list">
            {failing.map((id) => (
              <div key={id}>{renderRef?.(id) ?? id}</div>
            ))}
          </div>
        )}
        {detail && <div className="report-row-detail">{detail}</div>}
      </div>
    </div>
  );
}

export function PieceCheckRow({ check, renderRef }: { check: PieceCheck; renderRef: (id: string) => ReactNode }) {
  return (
    <CheckRow
      label={check.label}
      state={check.passed ? "pass" : "fail"}
      failing={check.failing}
      detail={check.passed ? undefined : check.detail}
      renderRef={renderRef}
    />
  );
}

/** The full reference, shown when hovering a chip. */
const RefTooltip = ({ label, text, children }: { label: string; text?: string; children: ReactElement }) =>
  text ? (
    <Tooltip
      title={
        <>
          <strong>{label}</strong> {text}
        </>
      }
      arrow
      placement="top"
    >
      {children}
    </Tooltip>
  ) : (
    children
  );

/** A chip followed by what it refers to, for references listed on their own. */
const WithText = ({ chip, text }: { chip: ReactNode; text?: string }) => (
  <span className="report-ref-line">
    {chip}
    <span className="report-ref-text">{text ?? "(not in the doc)"}</span>
  </span>
);

/**
 * An R#, A# or D# reference, coloured like its id chip. Hover shows the item's words; `withText`
 * also writes them after the chip.
 */
export function ItemRef({ id, onClick, withText = false }: { id: string; onClick: (id: string) => void; withText?: boolean }) {
  const text = useReferences().item(id);
  const chip = (
    <RefTooltip label={id} text={text}>
      <button type="button" className={`report-link ${itemRefClass(id)}`} onClick={() => onClick(id)}>
        {id}
      </button>
    </RefTooltip>
  );
  return withText ? <WithText chip={chip} text={text} /> : chip;
}

/**
 * A box, or a connection between two boxes, that shows itself on the diagram when clicked. Hover
 * shows the boxes' labels; `withText` also writes them after the chip.
 */
export function BoxRef({
  node,
  edge,
  onClick,
  withText = false,
}: {
  node?: string;
  edge?: EdgeRef;
  onClick: () => void;
  withText?: boolean;
}) {
  const refs = useReferences();
  const label = edge ? `${edge.from} → ${edge.to}` : (node ?? "");
  const text = edge
    ? `${refs.box(edge.from) ?? edge.from} → ${refs.box(edge.to) ?? edge.to}`
    : node
      ? refs.box(node)
      : undefined;
  const chip = (
    <RefTooltip label={label} text={text}>
      <button type="button" className={`report-link ${BOX_REF_CLASS}`} onClick={onClick}>
        {label}
      </button>
    </RefTooltip>
  );
  return withText ? <WithText chip={chip} text={text} /> : chip;
}

/** A chat message reference. Hover shows the quote, or the whole message when there is no quote. */
export function ChatRef({ index, quote, onChat }: { index: number; quote?: string; onChat: (index: number, quote?: string) => void }) {
  const message = useReferences().chat(index);
  const text = quote ? `“${quote}”` : message;
  return (
    <RefTooltip label={`Chat #${index}`} text={text}>
      <button type="button" className="report-link inline-ref inline-ref-chat" onClick={() => onChat(index, quote)}>
        Chat #{index}
      </button>
    </RefTooltip>
  );
}
