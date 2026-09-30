import type { ReactNode } from "react";
import { Tooltip } from "@mui/material";
import type { CaseDefinition, CaseFact } from "../../../cases";
import { FUNNEL_ORDER } from "../../../assessment/types";
import type { AssessmentResult, FoundFact, FunnelState } from "../../../assessment/types";
import type { ParsedDesignDoc } from "../../../designDoc/parse";
import { FUNNEL_LABELS } from "./reportData";
import type { ReportNav } from "./reportTypes";
import { useReferences } from "../panels/references";

/** One colour per end state: every stage a fact reached is drawn in the colour of where it ended up. */
const FUNNEL_COLORS: Record<FunnelState, string> = {
  carried_through: "#16a34a",
  not_drawn: "#f59e0b",
  unused: "#f97316",
  dropped: "#ef4444",
  assumed: "#a855f7",
  missed: "#b91c1c",
  client_failed: "#94a3b8",
  given: "#cbd5e1",
};

/** Light fills need dark text. */
const DARK_TEXT = new Set<FunnelState>(["given", "client_failed"]);

const STAGES = ["Chat", "Requirement", "Decision", "Final diagram"] as const;

/** States in the order their rows appear when the fact never reached a requirement. */
const OFF_DESIGN_ORDER: readonly FunnelState[] = ["assumed", "dropped", "client_failed", "missed", "given"];

type Cell = { content: ReactNode; title?: string } | null;
type Row = { fact: CaseFact; state: FunnelState; cells: Cell[]; order: number };

function Refs({ ids, onClick }: { ids: string[]; onClick: (id: string) => void }) {
  const refs = useReferences();
  return (
    <>
      {ids.map((id) => (
        <Tooltip key={id} title={<><strong>{id}</strong> {refs.item(id) ?? ""}</>} arrow placement="top">
          <button type="button" className="fact-graph-ref" onClick={() => onClick(id)}>
            {id}
          </button>
        </Tooltip>
      ))}
    </>
  );
}

function rowFor(
  fact: CaseFact,
  state: FunnelState,
  found: FoundFact | undefined,
  result: AssessmentResult,
  requirementOrder: Map<string, number>,
  nav: ReportNav,
): Row {
  const path = result.links.paths[fact.id];
  const cells: Cell[] = [null, null, null, null];
  if (state === "given") {
    cells[0] = { content: "Brief", title: "Given in the brief; not traced further" };
  } else if (found?.state === "surfaced" && found.messageIndex !== undefined) {
    const { messageIndex, quote } = found;
    cells[0] = {
      content: (
        <button type="button" className="fact-graph-ref" onClick={() => nav.chat(messageIndex, quote)}>
          Chat #{messageIndex}
        </button>
      ),
      title: quote,
    };
  } else if (state === "assumed") {
    cells[1] = { content: "in the doc, never asked", title: found?.quote };
  }
  if (path?.requirements.length) cells[1] = { content: <Refs ids={path.requirements} onClick={nav.item} /> };
  if (path?.decisions.length) cells[2] = { content: <Refs ids={path.decisions} onClick={nav.item} /> };
  if (path?.drawn.length) cells[3] = { content: <Refs ids={path.drawn} onClick={nav.sketch} /> };

  // In design order: by the first requirement that carries the fact; the rest follow, grouped by state.
  const first = path?.requirements.length ? Math.min(...path.requirements.map((id) => requirementOrder.get(id) ?? 0)) : null;
  const order = first ?? 1000 + OFF_DESIGN_ORDER.indexOf(state) * 100;
  return { fact, state, cells, order };
}

/** Level 2 graph: one row per fact, one column per stage, filled where the fact is present. */
export function FactGraph({
  result,
  caseDefinition,
  parsed,
  nav,
}: {
  result: AssessmentResult;
  caseDefinition: CaseDefinition;
  parsed: ParsedDesignDoc;
  nav: ReportNav;
}) {
  const foundById = new Map(result.found.facts.map((fact) => [fact.factId, fact]));
  const requirementOrder = new Map(parsed.requirements.map((item, index) => [item.id, index]));
  const rows = caseDefinition.facts
    .map((fact) =>
      rowFor(fact, result.links.funnel[fact.id] ?? "missed", foundById.get(fact.id), result, requirementOrder, nav),
    )
    .map((row, index) => ({ ...row, order: row.order + index / 100 }))
    .sort((a, b) => a.order - b.order);
  const counts = new Map<FunnelState, number>();
  for (const row of rows) counts.set(row.state, (counts.get(row.state) ?? 0) + 1);
  const legend = FUNNEL_ORDER.filter((state) => counts.has(state));

  return (
    <div className="fact-graph-wrap">
      <div className="fact-graph" role="table" aria-label="Where each fact ended up">
        <div className="fact-graph-row fact-graph-head" role="row">
          <span role="columnheader">Fact</span>
          {STAGES.map((stage) => (
            <span key={stage} role="columnheader">
              {stage}
            </span>
          ))}
          <span role="columnheader">Ended as</span>
        </div>
        {rows.map(({ fact, state, cells }) => {
          const color = FUNNEL_COLORS[state];
          const filled = cells.map((cell) => cell !== null);
          return (
            <div key={fact.id} className="fact-graph-row" role="row">
              <span className="fact-graph-fact" role="rowheader" title={fact.detail}>
                {fact.label}
              </span>
              {cells.map((cell, index) => (
                <span key={STAGES[index]} role="cell" className="fact-graph-stage">
                  {cell && (
                    <span
                      className={[
                        "fact-graph-bar",
                        !filled[index - 1] && "is-start",
                        !filled[index + 1] && "is-end",
                        DARK_TEXT.has(state) && "is-light",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ background: color }}
                      title={cell.title}
                    >
                      {cell.content}
                    </span>
                  )}
                </span>
              ))}
              <span role="cell" className="fact-graph-end" style={{ color: DARK_TEXT.has(state) ? undefined : color }}>
                {FUNNEL_LABELS[state]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="fact-graph-legend">
        {legend.map((state) => (
          <span key={state} className="fact-graph-legend-item">
            <span className="fact-graph-swatch" style={{ background: FUNNEL_COLORS[state] }} />
            {FUNNEL_LABELS[state]} ({counts.get(state)})
          </span>
        ))}
      </div>
    </div>
  );
}
