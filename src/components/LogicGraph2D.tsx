import { useCallback, useEffect, useMemo, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { ForceGraphMethods, LinkObject, NodeObject } from "react-force-graph-2d";
import type { LogicGraphData, LogicGraphLink, LogicGraphNode } from "../types";

type LogicGraph2DProps = {
  graph: LogicGraphData;
  width: number;
  height: number;
  selectedId: string | null;
  connectedIds: ReadonlySet<string>;
  reducedMotion: boolean;
  resetSignal: number;
  onSelect: (id: string | null) => void;
};

const STAGE_COLORS = {
  source: "#4f8fe8",
  chat: "#35b8a7",
  subjective: "#54a9df",
  objective: "#8b80e8",
  assessment: "#bd72d8",
  plan: "#e0a13a",
  design: "#e47758",
};

const HEALTH_COLORS = {
  grounded: "#65d39a",
  assumed: "#f0b84b",
  gap: "#ef6b73",
  neutral: "#9aaabd",
};

const endpointId = (endpoint: string | NodeObject<LogicGraphNode> | number | undefined) =>
  typeof endpoint === "object" ? String(endpoint.id) : String(endpoint ?? "");

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);

export default function LogicGraph2D({
  graph,
  width,
  height,
  selectedId,
  connectedIds,
  reducedMotion,
  resetSignal,
  onSelect,
}: LogicGraph2DProps) {
  const graphRef = useRef<ForceGraphMethods<LogicGraphNode, LogicGraphLink> | undefined>(undefined);
  const renderData = useMemo(
    () => ({
      nodes: graph.nodes.map((node) => ({ ...node })),
      links: graph.links.map((link) => ({ ...link })),
    }),
    [graph],
  );

  const isNodeActive = useCallback(
    (node: NodeObject<LogicGraphNode>) => !selectedId || connectedIds.has(node.id),
    [connectedIds, selectedId],
  );

  const isLinkActive = useCallback(
    (link: LinkObject<LogicGraphNode, LogicGraphLink>) => {
      if (!selectedId) return true;
      return connectedIds.has(endpointId(link.source)) && connectedIds.has(endpointId(link.target));
    },
    [connectedIds, selectedId],
  );

  useEffect(() => {
    graphRef.current?.zoomToFit(reducedMotion ? 0 : 450, 42);
  }, [reducedMotion, renderData, resetSignal]);

  useEffect(() => {
    if (!selectedId) return;
    const node = renderData.nodes.find((candidate) => candidate.id === selectedId);
    const graphApi = graphRef.current;
    if (!node || !graphApi) return;
    graphApi.centerAt(node.x, node.y, reducedMotion ? 0 : 500);
    graphApi.zoom(2.2, reducedMotion ? 0 : 500);
  }, [reducedMotion, renderData, selectedId]);

  const drawLabel = useCallback((node: NodeObject<LogicGraphNode>, context: CanvasRenderingContext2D, scale: number) => {
    if (node.x === undefined || node.y === undefined) return;
    const fontSize = 10 / scale;
    const paddingX = 4 / scale;
    const paddingY = 3 / scale;
    context.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
    const labelWidth = Math.min(context.measureText(node.label).width, 150 / scale);
    const x = node.x - labelWidth / 2 - paddingX;
    const y = node.y + 8 / scale;
    context.fillStyle = isNodeActive(node) ? "rgba(7, 18, 27, 0.86)" : "rgba(20, 31, 40, 0.42)";
    context.strokeStyle = isNodeActive(node) ? HEALTH_COLORS[node.health] : "rgba(80, 96, 108, 0.3)";
    context.lineWidth = 1 / scale;
    context.beginPath();
    context.roundRect(x, y, labelWidth + paddingX * 2, fontSize + paddingY * 2, 3 / scale);
    context.fill();
    context.stroke();
    context.save();
    context.beginPath();
    context.rect(x + paddingX, y, labelWidth, fontSize + paddingY * 2);
    context.clip();
    context.fillStyle = isNodeActive(node) ? "#f8fbff" : "#71808a";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(node.label, x + paddingX, y + (fontSize + paddingY * 2) / 2);
    context.restore();
  }, [isNodeActive]);

  return (
    <ForceGraph2D<LogicGraphNode, LogicGraphLink>
      ref={graphRef}
      graphData={renderData}
      width={width}
      height={height}
      backgroundColor="#07121b"
      nodeRelSize={5}
      nodeVal={(node) => node.id === selectedId ? 2.2 : node.health === "gap" ? 1.35 : 1}
      nodeColor={(node) => isNodeActive(node) ? STAGE_COLORS[node.stage] : "#344451"}
      nodeLabel={(node) => `<strong>${escapeHtml(node.stage.toUpperCase())}</strong><br>${escapeHtml(node.label)}`}
      nodeCanvasObjectMode={() => "after"}
      nodeCanvasObject={drawLabel}
      linkColor={(link) => {
        if (!isLinkActive(link)) return "rgba(76, 91, 104, 0.18)";
        return HEALTH_COLORS[link.health];
      }}
      linkLineDash={(link) => link.health === "grounded" ? null : [5, 4]}
      linkCurvature={(link) => link.curvature ?? 0}
      linkWidth={(link) => isLinkActive(link) ? (link.health === "grounded" ? 1.4 : 1) : 0.25}
      linkDirectionalArrowLength={4.5}
      linkDirectionalArrowRelPos={0.72}
      linkDirectionalParticles={(link) => {
        if (reducedMotion || !selectedId) return 0;
        return isLinkActive(link) ? 3 : 0;
      }}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleSpeed={0.004}
      warmupTicks={0}
      cooldownTicks={0}
      enableNodeDrag={false}
      onNodeClick={(node) => onSelect(node.id)}
      onBackgroundClick={() => onSelect(null)}
      onEngineStop={() => graphRef.current?.zoomToFit(reducedMotion ? 0 : 400, 42)}
    />
  );
}
