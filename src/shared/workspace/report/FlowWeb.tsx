import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Tooltip } from "@mui/material";
import { flowWeb, orderFlow } from "../../../assessment/flow";
import type { WebEdge, WebGraph, WebNode } from "../../../assessment/flow";
import { plainText } from "../panels/references";
import { BoxRef, ChatRef, ItemRef } from "./ReportLayer";
import type { ReportNav } from "./reportTypes";

/** Columns are laid out in the SVG's 1000 units: equal widths with a 40-unit (4%) gap; rows 34px apart. */
const GAP = 40;
const ROW = 34;
const NODE_MIDDLE = 14;

/** An item's words without its brief and chat citations, which the lines already show; R# and D# stay. */
const CITATION_LINK = /\[[^\]]*\]\(#(?:cs|chat-msg-\d+)(?:\s+"(?:[^"\\]|\\.)*")?\)/g;
const words = (node: WebNode) =>
  node.target.kind === "item" ? plainText(node.text.replace(CITATION_LINK, "")).replace(/[\s—–-]+$/, "") : node.text;

/** What the selected node opens on the left. */
function OpenNode({ node, nav }: { node: WebNode; nav: ReportNav }) {
  const { target } = node;
  if (target.kind === "item") return <ItemRef id={target.id} onClick={nav.item} withText />;
  if (target.kind === "sketch") {
    return (
      <span className="report-ref-line">
        <ItemRef id={target.id} onClick={nav.sketch} />
        <span className="report-ref-text">sketch</span>
      </span>
    );
  }
  if (target.kind === "box") return <BoxRef node={target.id} onClick={() => nav.node(target.id)} withText />;
  if (target.kind === "chat") return <ChatRef index={target.messageIndex} quote={target.quotes[0]} onChat={nav.chat} />;
  return (
    <button type="button" className="report-link inline-ref" onClick={() => nav.brief(target.quotes[0])}>
      Brief
    </button>
  );
}

/**
 * A web: every item once, in columns, joined by links. A heading sorts its column and lines the others
 * up behind it; a node lights up its web, everything it comes from and everything it leads to.
 * `nodeTip` and `edgeTip` add to what hovering a node or a link shows (level 2's critiques).
 */
export function FlowWeb({
  graph,
  columns,
  defaultAnchor,
  nav,
  fill,
  edgeColor,
  nodeTip,
  edgeTip,
  hint,
  legend,
}: {
  graph: WebGraph;
  columns: readonly { id: string; label: string }[];
  defaultAnchor: string;
  nav: ReportNav;
  /** The colour a node is filled with, if any. */
  fill?: (node: WebNode) => string | undefined;
  edgeColor: (edge: WebEdge) => string;
  /** More to show when hovering a node, under its words. */
  nodeTip?: (node: WebNode) => ReactNode;
  /** What hovering a link shows; links without it can't be hovered. */
  edgeTip?: (edge: WebEdge) => ReactNode;
  hint: string;
  legend: ReactNode;
}) {
  const [anchor, setAnchor] = useState(defaultAnchor);
  const [selected, setSelected] = useState<string | null>(null);
  const columnIds = useMemo(() => columns.map((column) => column.id), [columns]);
  const order = useMemo(() => orderFlow(graph, columnIds, anchor), [graph, columnIds, anchor]);
  const web = useMemo(
    () => (selected && graph.nodes.some((node) => node.key === selected) ? flowWeb(graph, selected) : null),
    [graph, selected],
  );

  const width = (1000 - GAP * (columns.length - 1)) / columns.length;
  const grid = { gridTemplateColumns: `repeat(${columns.length}, ${width / 10}%)`, columnGap: `${GAP / 10}%` };
  const byKey = new Map(graph.nodes.map((node) => [node.key, node]));
  const place = new Map<string, { column: number; row: number }>();
  columnIds.forEach((column, index) => (order[column] ?? []).forEach((key, row) => place.set(key, { column: index, row })));
  const height = Math.max(...columnIds.map((column) => order[column]?.length ?? 0), 1) * ROW;
  const selectedNode = selected ? byKey.get(selected) : undefined;

  return (
    <div className="flow-web-wrap">
      <div className="flow-web" style={{ minWidth: columns.length > 4 ? 780 : 640 }}>
        <div className="flow-web-cols flow-web-head" style={grid}>
          {columns.map((column) => (
            <button
              key={column.id}
              type="button"
              className={column.id === anchor ? "flow-web-sort is-active" : "flow-web-sort"}
              aria-pressed={column.id === anchor}
              title={`Sort by ${column.label.toLowerCase()}`}
              onClick={() => setAnchor(column.id)}
            >
              {column.label} {column.id === anchor ? "▾" : ""}
            </button>
          ))}
        </div>

        <div className="flow-web-body" style={{ height }}>
          <svg className="flow-web-lines" viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden="true">
            {graph.edges.map((edge) => {
              const from = place.get(edge.from);
              const to = place.get(edge.to);
              if (!from || !to) return null;
              const x1 = from.column * (width + GAP) + width;
              const x2 = to.column * (width + GAP);
              const y1 = from.row * ROW + NODE_MIDDLE;
              const y2 = to.row * ROW + NODE_MIDDLE;
              const lit = !web || (web.has(edge.from) && web.has(edge.to));
              const d = `M ${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2} ${y2}`;
              return (
                <g key={`${edge.from}>${edge.to}`}>
                  {/* A wide, invisible path under the line, so a thin line is easy to click. */}
                  {edgeTip && (
                    <Tooltip title={<div className="flow-tip">{edgeTip(edge)}</div>} followCursor placement="top">
                      <path d={d} className="flow-web-hit" data-edge={`${edge.from}>${edge.to}`} />
                    </Tooltip>
                  )}
                  <path d={d} stroke={edgeColor(edge)} className={lit ? "flow-web-line" : "flow-web-line is-faded"} />
                </g>
              );
            })}
          </svg>

          <div className="flow-web-cols" style={grid}>
            {columnIds.map((column) => (
              <div key={column} className="flow-web-col">
                {(order[column] ?? []).map((key) => {
                  const node = byKey.get(key)!;
                  const text = words(node);
                  const color = fill?.(node);
                  const classes = [
                    "flow-node",
                    `in-${node.column}`,
                    `is-${node.tone}`,
                    color && "is-filled",
                    selected === key && "is-selected",
                    web && !web.has(key) && "is-faded",
                  ].filter(Boolean);
                  return (
                    <Tooltip
                      key={key}
                      title={
                        <div className="flow-tip">
                          <div>
                            <strong>{node.label}</strong> {text}
                          </div>
                          {nodeTip?.(node)}
                        </div>
                      }
                      arrow
                      placement="top"
                      enterDelay={nodeTip ? 150 : 400}
                    >
                      <button
                        type="button"
                        className={classes.join(" ")}
                        style={color ? ({ "--flow-color": color } as CSSProperties) : undefined}
                        aria-pressed={selected === key}
                        onClick={() => {
                          setSelected((current) => (current === key ? null : key));
                        }}
                      >
                        <span className="flow-node-id">{node.label}</span>
                        {node.column !== "source" && text && <span className="flow-node-text">{text}</span>}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flow-web-foot">
        {selectedNode ? (
          <span className="flow-web-selected">
            Showing the web of <OpenNode node={selectedNode} nav={nav} />
            <button type="button" className="report-link flow-web-clear" onClick={() => setSelected(null)}>
              Show all
            </button>
          </span>
        ) : (
          <span>{hint}</span>
        )}
      </div>
      <div className="flow-graph-legend">{legend}</div>
    </div>
  );
}
