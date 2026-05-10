import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dispatch, DragEvent, ReactNode, SetStateAction } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type {
  Connection,
  Edge,
  Node,
  NodeProps,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import {
  COMPONENT_LATENCY,
  INITIAL_EDGES,
  INITIAL_NODES,
  NODE_COLORS,
  PALETTE_ITEMS,
} from "../constants";
import type { SimLogEntry } from "../types";
import { escapeMermaidLabel } from "../utils";

const CanvasReadOnlyCtx = createContext(false);

type DesignMutators = {
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
};

const DesignMutatorsCtx = createContext<DesignMutators | null>(null);

type DesignData = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
};

const DesignDataCtx = createContext<DesignData | null>(null);

export function DesignStateProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(INITIAL_EDGES);

  const mutators = useMemo(() => ({ setNodes, setEdges }), [setNodes, setEdges]);
  const data = useMemo(
    () => ({ nodes, edges, onNodesChange, onEdgesChange }),
    [edges, nodes, onEdgesChange, onNodesChange],
  );

  return (
    <DesignMutatorsCtx.Provider value={mutators}>
      <DesignDataCtx.Provider value={data}>{children}</DesignDataCtx.Provider>
    </DesignMutatorsCtx.Provider>
  );
}

const CustomNode = memo(function CustomNode({ id, data }: NodeProps) {
  const readOnly = useContext(CanvasReadOnlyCtx);
  const { setNodes, setEdges } = useContext(DesignMutatorsCtx)!;
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(String(data.label ?? ""));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commitLabel = useCallback(() => {
    const nextLabel = draftLabel.trim() || String(data.label ?? id);
    setNodes((current) =>
      current.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, label: nextLabel } } : node,
      ),
    );
    setEditing(false);
  }, [data.label, draftLabel, id, setNodes]);

  const deleteNode = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setNodes((current) => current.filter((node) => node.id !== id));
      setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    },
    [id, setEdges, setNodes],
  );

  const label = String(data.label ?? "");

  return (
    <div className="custom-node" style={{ background: String(data.color ?? "#fff") }}>
      <Handle type="target" position={Position.Top} />
      <div className="custom-node-body">
        {editing ? (
          <input
            ref={inputRef}
            className="custom-node-input nodrag nopan"
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") commitLabel();
              if (event.key === "Escape") {
                setDraftLabel(label);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span
            className="custom-node-label"
            title={readOnly ? undefined : "Double-click to rename"}
            onDoubleClick={readOnly ? undefined : () => {
              setDraftLabel(label);
              setEditing(true);
            }}
          >
            {label}
          </span>
        )}
        {!readOnly && (
          <button className="node-delete-btn" onClick={deleteNode} title="Delete">
            x
          </button>
        )}
      </div>
      <span className="custom-node-type">{String(data.nodeType ?? "")}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

const nodeTypes = { custom: CustomNode };

type DesignCanvasInnerProps = {
  readOnly?: boolean;
  showSim?: boolean;
  title?: string;
  subtitle?: string;
  simStartNodeId: string;
  setSimStartNodeId: (nodeId: string) => void;
};

const edgeTargetKey = (edge: Edge) => `${edge.source}->${edge.target}`;
const edgeId = (edge: Edge) => edge.id;
const edgeTarget = (edge: Edge) => edge.target;
const hasSource = (node: Node) => !["database", "cache"].includes(String(node.data.nodeType ?? ""));
const truthy = <T,>(value: T | null | undefined): value is T => Boolean(value);

export const DesignCanvasInner = memo(function DesignCanvasInner({
  readOnly = false,
  showSim = false,
  title = "System Design",
  subtitle,
  simStartNodeId,
  setSimStartNodeId,
}: DesignCanvasInnerProps) {
  const toolbarVisible = !readOnly || showSim;
  const { nodes, edges, onNodesChange, onEdgesChange } = useContext(DesignDataCtx)!;
  const { setNodes, setEdges } = useContext(DesignMutatorsCtx)!;
  const { screenToFlowPosition } = useReactFlow();
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMermaidOpen, setIsMermaidOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(true);
  const [simLog, setSimLog] = useState<SimLogEntry[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [doneNodes, setDoneNodes] = useState<Set<string>>(new Set());
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (simStartNodeId && !nodes.find((node) => node.id === simStartNodeId)) {
      setSimStartNodeId("");
    }
  }, [nodes, setSimStartNodeId, simStartNodeId]);

  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const resetSimulationMarks = useCallback(() => {
    setActiveNodes(new Set());
    setDoneNodes(new Set());
    setActiveEdges(new Set());
  }, []);

  const stopSimulation = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setIsSimulating(false);
    setSimLog([{ text: "Stopped", kind: "stop" }]);
    resetSimulationMarks();
  }, [resetSimulationMarks]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          current,
        ),
      ),
    [setEdges],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const label = PALETTE_ITEMS.find((item) => item.nodeType === nodeType)?.label ?? nodeType;

      setNodes((current) =>
        current.concat({
          id: `${nodeType}-${Date.now()}`,
          type: "custom",
          position,
          data: { label, color: NODE_COLORS[nodeType] ?? "#fff", nodeType },
        }),
      );
    },
    [screenToFlowPosition, setNodes],
  );

  const simulate = useCallback(() => {
    if (nodes.length === 0 || isSimulating) return;

    const targetKeys = new Set(edges.map(edgeTargetKey));
    const selectedStart = simStartNodeId ? nodes.find((node) => node.id === simStartNodeId) : null;
    const start =
      selectedStart ?? nodes.find(hasSource) ?? nodes.find((node) => !targetKeys.has(node.id)) ?? nodes[0];

    const levels: {
      nodeIds: string[];
      labels: string[];
      edgeIds: string[];
      maxLatency: number;
    }[] = [];
    const visited = new Set<string>();
    let frontier = [start.id];

    while (frontier.length > 0) {
      const labels = frontier.map(
        (id) => String(nodes.find((node) => node.id === id)?.data.label ?? id),
      );
      const maxLatency = Math.max(
        ...frontier.map((id) => COMPONENT_LATENCY[id.split("-")[0]] ?? 10),
      );
      const outgoing = frontier.flatMap((id) =>
        edges.filter((edge) => edge.source === id && !visited.has(edge.target)),
      );

      levels.push({
        nodeIds: [...frontier],
        labels,
        edgeIds: outgoing.map(edgeId),
        maxLatency,
      });

      frontier.forEach((id) => visited.add(id));
      frontier = [...new Set(outgoing.map(edgeTarget).filter((id) => !visited.has(id)))];
    }

    let cumulativeMs = 0;
    let cursorMs = 0;
    const timeline = levels.map((level, index) => {
      const nodeAt = cursorMs;
      const edgeAt = cursorMs + 380;
      cumulativeMs += level.maxLatency;
      cursorMs += 380 + Math.max(500, level.maxLatency * 18) + 200;
      return { level, index, nodeAt, edgeAt, cumulativeMs };
    });
    const bottleneck = levels
      .flatMap((level) =>
        level.nodeIds.map((id) => ({
          label: String(nodes.find((node) => node.id === id)?.data.label ?? id),
          latency: COMPONENT_LATENCY[id.split("-")[0]] ?? 10,
        })),
      )
      .sort((a, b) => b.latency - a.latency)[0];

    setIsSimulating(true);
    setIsLogOpen(true);
    setSimLog([{ text: "Broadcasting...", kind: "start" }]);

    const pending: ReturnType<typeof setTimeout>[] = [];
    timeline.forEach(({ level, index, nodeAt, edgeAt, cumulativeMs }) => {
      pending.push(
        setTimeout(() => {
          setActiveNodes(new Set(level.nodeIds));
          if (index > 0) {
            setDoneNodes((current) => new Set([...current, ...levels[index - 1].nodeIds]));
          }
          const latency = level.maxLatency > 0 ? ` +${level.maxLatency}ms` : "";
          setSimLog((current) => [
            ...current,
            { text: `${level.labels.join(", ")}${latency} - ${cumulativeMs}ms total`, kind: "hop" },
          ]);
        }, nodeAt),
      );

      if (level.edgeIds.length > 0) {
        pending.push(
          setTimeout(() => {
            setActiveEdges((current) => new Set([...current, ...level.edgeIds]));
            setSimLog((current) => [
              ...current,
              {
                text: `${level.edgeIds.length} message${level.edgeIds.length > 1 ? "s" : ""} sent`,
                kind: "edge",
              },
            ]);
          }, edgeAt),
        );
      }
    });

    pending.push(
      setTimeout(() => {
        const lastLevel = levels[levels.length - 1];
        if (lastLevel) setDoneNodes((current) => new Set([...current, ...lastLevel.nodeIds]));
        setActiveNodes(new Set());
      }, cursorMs),
    );

    pending.push(
      setTimeout(() => {
        resetSimulationMarks();
        setIsSimulating(false);
        setSimLog((current) => [
          ...current,
          { text: `Complete - ${cumulativeMs}ms`, kind: "done" },
          ...(bottleneck && bottleneck.latency > 0
            ? [{ text: `Bottleneck: ${bottleneck.label} (${bottleneck.latency}ms)`, kind: "stat" as const }]
            : []),
        ]);
        timeoutsRef.current = [];
      }, cursorMs + 800),
    );

    timeoutsRef.current = pending;
  }, [edges, isSimulating, nodes, resetSimulationMarks, simStartNodeId]);

  const displayedNodes = useMemo(() => {
    if (!isSimulating) return nodes;
    return nodes.map((node) => ({
      ...node,
      className: activeNodes.has(node.id) ? "node-active" : doneNodes.has(node.id) ? "node-done" : "",
      style: activeNodes.has(node.id) || doneNodes.has(node.id) ? { opacity: 1 } : { opacity: 0.3 },
    }));
  }, [activeNodes, doneNodes, isSimulating, nodes]);

  const displayedEdges = useMemo(() => {
    if (activeEdges.size === 0) return edges;
    return edges.map((edge) => ({
      ...edge,
      animated: activeEdges.has(edge.id),
      style: activeEdges.has(edge.id) ? { stroke: "#f59e0b", strokeWidth: 2.5 } : undefined,
    }));
  }, [activeEdges, edges]);

  const mermaidCode = useMemo(() => {
    const aliases = new Map<string, string>();
    const nodeLines = nodes.map((node, index) => {
      const alias = `N${index + 1}`;
      aliases.set(node.id, alias);
      return `  ${alias}["${escapeMermaidLabel(String(node.data.label ?? node.id))}"]`;
    });
    const edgeLines = edges
      .map((edge) => {
        const source = aliases.get(edge.source);
        const target = aliases.get(edge.target);
        return source && target ? `  ${source} --> ${target}` : null;
      })
      .filter(truthy);

    return ["flowchart TD", ...nodeLines, ...edgeLines].join("\n");
  }, [edges, nodes]);

  const toolbar = toolbarVisible ? (
    <div className="sim-toolbar">
      <Select
        size="small"
        displayEmpty
        disabled={isSimulating || nodes.length === 0}
        value={simStartNodeId}
        onChange={(event) => setSimStartNodeId(event.target.value)}
        sx={{ fontSize: 12, minWidth: 112, flexShrink: 0 }}
      >
        <MenuItem value="">
          <em>Auto (Client)</em>
        </MenuItem>
        {nodes.map((node) => (
          <MenuItem key={node.id} value={node.id}>
            {String(node.data.label ?? node.id)}
          </MenuItem>
        ))}
      </Select>
      <Button
        size="small"
        variant="contained"
        color="warning"
        disabled={nodes.length === 0 || isSimulating}
        onClick={simulate}
      >
        Simulate
      </Button>
      {isSimulating && (
        <Button size="small" variant="outlined" color="error" onClick={stopSimulation}>
          Stop
        </Button>
      )}
      {!readOnly && (
        <Button
          size="small"
          variant="outlined"
          disabled={isSimulating || nodes.length === 0}
          onClick={() => {
            setNodes([]);
            setEdges([]);
            setSimLog([]);
          }}
        >
          Clear
        </Button>
      )}
      {simLog.length > 0 && !isLogOpen && (
        <Button size="small" variant="outlined" onClick={() => setIsLogOpen(true)}>
          Show Log
        </Button>
      )}
      <Button
        size="small"
        variant="outlined"
        disabled={nodes.length === 0}
        onClick={() => setIsMermaidOpen(true)}
      >
        Export to Mermaid
      </Button>
    </div>
  ) : null;

  return (
    <CanvasReadOnlyCtx.Provider value={readOnly}>
      <div className="design-canvas-wrap">
        {(title || subtitle || toolbar) && (
          <div className="design-panel-header">
            <div className="design-panel-heading">
              {title && <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>}
              {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </div>
            {toolbar}
          </div>
        )}
        {(title || toolbar) && <Divider />}
        <div className="design-canvas-main">
          <div className="design-flow">
            <ReactFlow
              nodes={displayedNodes}
              edges={displayedEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={readOnly ? undefined : onConnect}
              onDrop={readOnly ? undefined : onDrop}
              onDragOver={readOnly ? undefined : onDragOver}
              nodesDraggable={!readOnly}
              nodesConnectable={!readOnly}
              elementsSelectable={!readOnly}
              deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
              defaultEdgeOptions={{
                type: "smoothstep",
                interactionWidth: 20,
                style: { strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed },
              }}
              snapToGrid
              snapGrid={[40, 40]}
              fitView
            >
              <Background variant={BackgroundVariant.Lines} gap={40} color="#e2e8f0" />
              <Controls />
              <MiniMap zoomable pannable nodeStrokeWidth={2} style={{ width: 118, height: 76 }} />
            </ReactFlow>
          </div>
          {toolbarVisible && simLog.length > 0 && isLogOpen && (
            <div className="sim-log">
              <div className="sim-log-header">
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Simulation Log
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  onClick={() => setIsLogOpen(false)}
                  sx={{ minWidth: 0, padding: "2px 6px" }}
                >
                  Close
                </Button>
              </div>
              {simLog.map((entry, index) => (
                <div key={`${entry.kind}-${index}`} className={`sim-log-line sim-log-${entry.kind}`}>
                  {entry.text}
                </div>
              ))}
            </div>
          )}
        </div>
        {!readOnly && (
          <>
            <Divider />
            <div className="design-palette">
              {PALETTE_ITEMS.map((item) => (
                <div
                  key={item.nodeType}
                  className="palette-item"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/reactflow", item.nodeType);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  style={{ background: NODE_COLORS[item.nodeType] }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </>
        )}
        <Dialog
          open={isMermaidOpen}
          onClose={() => setIsMermaidOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>Mermaid Export</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              multiline
              minRows={16}
              value={mermaidCode}
              slotProps={{ htmlInput: { readOnly: true } }}
              sx={{
                "& .MuiInputBase-input": {
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.84rem",
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsMermaidOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </div>
    </CanvasReadOnlyCtx.Provider>
  );
});
