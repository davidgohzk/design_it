import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button, ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  connectedLogicNodeIds,
  filterLogicGraph,
  listLogicChains,
} from "../logicGraph";
import type { LogicGraphData, LogicGraphNode, LogicStage } from "../types";

const LogicGraph2D = lazy(() => import("./LogicGraph2D"));

const SOAP_STAGES: LogicStage[] = [
  "source",
  "chat",
  "subjective",
  "objective",
  "assessment",
  "plan",
  "design",
];
const STAGE_LABELS: Record<LogicStage, string> = {
  source: "Source",
  chat: "Chat",
  subjective: "S - Subjective",
  objective: "O - Objective",
  assessment: "A - Assessment",
  plan: "P - Plan",
  design: "Design",
};

const RELATION_LABELS = {
  elicited_as: "elicited as",
  cited_by: "cited by",
  appears_as: "appears as",
  informs: "informs",
  develops_into: "develops into",
};

function LogicChainList({ graph, onSelect }: {
  graph: LogicGraphData;
  onSelect: (id: string) => void;
}) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const chains = listLogicChains(graph);
  if (chains.length === 0) return <p className="logic-graph-empty">No chains match these filters.</p>;
  return (
    <ol className="logic-chain-list">
      {chains.map((chain, chainIndex) => (
        <li key={`${chain.join(":")}-${chainIndex}`}>
          <div className="logic-chain-path">
            {chain.map((nodeId, index) => {
              const node = nodesById.get(nodeId);
              if (!node) return null;
              return (
                <span className="logic-chain-step-wrap" key={nodeId}>
                  {index > 0 && <span className="logic-chain-arrow" aria-hidden="true">→</span>}
                  <button
                    type="button"
                    className={`logic-chain-step logic-chain-step-${node.stage} logic-health-${node.health}`}
                    onClick={() => onSelect(node.id)}
                  >
                    <small>{STAGE_LABELS[node.stage]}</small>
                    {node.label}
                  </button>
                </span>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}

function NodeInspector({ node, graph, onClose }: {
  node: LogicGraphNode;
  graph: LogicGraphData;
  onClose: () => void;
}) {
  const incoming = graph.links.filter((link) => link.target === node.id);
  const outgoing = graph.links.filter((link) => link.source === node.id);
  const nodesById = new Map(graph.nodes.map((item) => [item.id, item]));
  return (
    <aside className="logic-inspector" aria-label="Selected logic node">
      <div className="logic-inspector-heading">
        <div>
          <span>{STAGE_LABELS[node.stage]} · {node.kind} · {node.health}</span>
          <h3>{node.label}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close node details">×</button>
      </div>
      {node.sourceLabel && <div className="logic-inspector-source">{node.sourceLabel}</div>}
      <p className="logic-inspector-text">{node.text}</p>
      <p className="logic-inspector-detail">{node.detail}</p>
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="logic-inspector-relations">
          <h4>Connections</h4>
          {[...incoming, ...outgoing].map((link) => {
            const incomingLink = link.target === node.id;
            const other = nodesById.get(incomingLink ? link.source : link.target);
            return (
              <div key={link.id}>
                <span>{incomingLink ? "←" : "→"} {RELATION_LABELS[link.relation]}</span>
                <strong>{other?.label ?? "Unknown node"}</strong>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

export function LogicGraphSection({ graph }: { graph: LogicGraphData }) {
  const [displayMode, setDisplayMode] = useState<"graph" | "list">("graph");
  const [visibleStages, setVisibleStages] = useState<LogicStage[]>(SOAP_STAGES);
  const [healthFilter, setHealthFilter] = useState<"all" | "grounded" | "gaps">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 640 });
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const graphHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const host = graphHostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(280, Math.floor(entry.contentRect.width));
      setCanvasSize({ width, height: width <= 560 ? 500 : 640 });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const filteredGraph = useMemo(
    () => filterLogicGraph(graph, new Set(visibleStages), healthFilter),
    [graph, healthFilter, visibleStages],
  );
  const effectiveSelectedId = filteredGraph.nodes.some((node) => node.id === selectedId)
    ? selectedId
    : null;
  const connectedIds = useMemo(
    () => connectedLogicNodeIds(filteredGraph, effectiveSelectedId),
    [effectiveSelectedId, filteredGraph],
  );
  const selectedNode = filteredGraph.nodes.find((node) => node.id === effectiveSelectedId);

  const toggleStage = (stage: LogicStage) => {
    setVisibleStages((current) =>
      current.includes(stage) ? current.filter((item) => item !== stage) : [...current, stage],
    );
  };

  return (
    <section className="review-section logic-graph-section" aria-labelledby="logic-graph-heading">
      <div className="review-section-heading">
        <div>
          <span className="review-section-kicker">Evidence flow</span>
          <h2 id="logic-graph-heading">Logic chains</h2>
          <p>Trace evidence through the interview, SOAP reasoning, and resulting design.</p>
        </div>
        <div className="logic-graph-summary">
          <strong>{graph.nodes.length}</strong>
          <span>nodes</span>
          <strong>{graph.links.length}</strong>
          <span>links</span>
        </div>
      </div>

      <div className="logic-graph-legend" aria-label="Logic graph legend">
        <span><i className="logic-legend-grounded" /> Grounded</span>
        <span><i className="logic-legend-assumed" /> Assumed</span>
        <span><i className="logic-legend-gap" /> Broken or missing</span>
        {displayMode === "graph" && <small>Drag to pan · scroll to zoom · select a node to trace its chain</small>}
      </div>

      <div className="logic-graph-toolbar" aria-label="Logic graph controls">
        <div className="logic-stage-filters">
          {SOAP_STAGES.map((stage) => (
            <button
              type="button"
              key={stage}
              className={`logic-stage-toggle logic-stage-toggle-${stage}`}
              aria-pressed={visibleStages.includes(stage)}
              onClick={() => toggleStage(stage)}
            >
              {STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={healthFilter}
          onChange={(_event, value) => { if (value) setHealthFilter(value); }}
          aria-label="Filter chains by health"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="grounded">Grounded</ToggleButton>
          <ToggleButton value="gaps">Gaps</ToggleButton>
        </ToggleButtonGroup>
        <div className="logic-view-actions">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={displayMode}
            onChange={(_event, value) => { if (value) setDisplayMode(value); }}
            aria-label="Logic graph display mode"
          >
            <ToggleButton value="graph">Graph</ToggleButton>
            <ToggleButton value="list">List</ToggleButton>
          </ToggleButtonGroup>
          <Button
            size="small"
            onClick={() => {
              setSelectedId(null);
              setVisibleStages(SOAP_STAGES);
              setHealthFilter("all");
              setResetSignal((value) => value + 1);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className={selectedNode ? "logic-graph-layout has-inspector" : "logic-graph-layout"}>
        <div className="logic-graph-host" ref={graphHostRef}>
          {displayMode === "graph" ? (
            filteredGraph.nodes.length > 0 ? (
              <Suspense fallback={<div className="logic-graph-loading">Loading graph…</div>}>
                <LogicGraph2D
                  graph={filteredGraph}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  selectedId={effectiveSelectedId}
                  connectedIds={connectedIds}
                  reducedMotion={reducedMotion}
                  resetSignal={resetSignal}
                  onSelect={setSelectedId}
                />
              </Suspense>
            ) : (
              <p className="logic-graph-empty">No nodes match these filters.</p>
            )
          ) : (
            <LogicChainList graph={filteredGraph} onSelect={setSelectedId} />
          )}
        </div>
        {selectedNode && (
          <NodeInspector node={selectedNode} graph={filteredGraph} onClose={() => setSelectedId(null)} />
        )}
      </div>

    </section>
  );
}
