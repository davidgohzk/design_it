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
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { FormEvent, KeyboardEvent, DragEvent, MouseEvent } from "react";
import {
  Box,
  Button,
  CssBaseline,
  MenuItem,
  Select,
  Divider,
  Paper,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  createTheme,
} from "@mui/material";
import { Groq } from "groq-sdk";
import mermaid from "mermaid";
import ReactMarkdown from "react-markdown";
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
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type {
  Node,
  Edge,
  Connection,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import sourceMarkdown from "./assets/test.md?raw";
import "./App.css";

// ─── types ────────────────────────────────────────────────────────────────────

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type SimLogEntry = {
  text: string;
  kind: "start" | "hop" | "edge" | "done" | "stop" | "stat";
};

// ─── theme ────────────────────────────────────────────────────────────────────

const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#006f9a" },
    secondary: { main: "#8f4889" },
    background: { default: "#e6eef3", paper: "#f7fbff" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
});

// ─── constants ────────────────────────────────────────────────────────────────

const defaultSystemPrompt = `You are Sarah, a program director at BrightPath, an NGO that supports vulnerable children in urban communities. You are not a developer — you are a non-technical manager who needs a system built.

Your field workers currently use WhatsApp to report incidents involving at-risk children. Messages get lost, case managers miss alerts, and there is no way to track whether an alert was acknowledged or acted upon.

You want a digital system where field workers can log an incident, and the system automatically notifies the right case managers and supervisors based on the child's assigned case. You want to know that alerts are received, and you want a record of every incident and response.

A developer will ask you questions to clarify requirements and design the system. Respond like a real non-technical client: explain your problems in plain language, answer questions based on your experience, and help the developer understand what matters most to your team.`;

const PALETTE_ITEMS = [
  { nodeType: "client", label: "Client" },
  { nodeType: "server", label: "Server" },
  { nodeType: "database", label: "Database" },
  { nodeType: "cache", label: "Cache" },
  { nodeType: "loadBalancer", label: "Load Balancer" },
  { nodeType: "queue", label: "Queue" },
  { nodeType: "cdn", label: "CDN" },
  { nodeType: "apiGateway", label: "API Gateway" },
];

const NODE_COLORS: Record<string, string> = {
  client: "#86efac",
  server: "#93c5fd",
  database: "#d8b4fe",
  cache: "#fdba74",
  loadBalancer: "#fca5a5",
  queue: "#6ee7b7",
  cdn: "#bef264",
  apiGateway: "#f9a8d4",
};

const INITIAL_NODES: Node[] = [
  { id: "client-1",     type: "custom", position: { x: 160, y: 40  }, data: { label: "Field Worker App",    color: NODE_COLORS.client,     nodeType: "client"     } },
  { id: "apiGateway-1", type: "custom", position: { x: 160, y: 160 }, data: { label: "API Gateway",         color: NODE_COLORS.apiGateway, nodeType: "apiGateway" } },
  { id: "server-1",     type: "custom", position: { x: 80,  y: 280 }, data: { label: "Incident Server",     color: NODE_COLORS.server,     nodeType: "server"     } },
  { id: "database-1",   type: "custom", position: { x: 320, y: 280 }, data: { label: "Incident DB",         color: NODE_COLORS.database,   nodeType: "database"   } },
  { id: "queue-1",      type: "custom", position: { x: 80,  y: 400 }, data: { label: "Alert Queue",         color: NODE_COLORS.queue,      nodeType: "queue"      } },
  { id: "server-2",     type: "custom", position: { x: 80,  y: 520 }, data: { label: "Notification Server", color: NODE_COLORS.server,     nodeType: "server"     } },
];

const ARROW = { type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } };

const INITIAL_EDGES: Edge[] = [
  { id: "e1", source: "client-1",     target: "apiGateway-1", ...ARROW },
  { id: "e2", source: "apiGateway-1", target: "server-1",     ...ARROW },
  { id: "e3", source: "server-1",     target: "database-1",   ...ARROW },
  { id: "e4", source: "server-1",     target: "queue-1",      ...ARROW },
  { id: "e5", source: "queue-1",      target: "server-2",     ...ARROW },
  { id: "e6", source: "server-2",     target: "database-1",   ...ARROW },
];

const COMPONENT_LATENCY: Record<string, number> = {
  client: 0,
  cdn: 3,
  apiGateway: 5,
  loadBalancer: 2,
  server: 30,
  cache: 2,
  database: 15,
  queue: 8,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const roleLabel = (role: ChatRole) => (role === "user" ? "You" : "Grok");

// ─── MermaidBlock ─────────────────────────────────────────────────────────────

function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const run = async () => {
      try {
        setError(null);
        mermaid.initialize({ startOnLoad: false, theme: "default" });
        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!disposed && containerRef.current) containerRef.current.innerHTML = svg;
      } catch (err) {
        if (!disposed)
          setError(err instanceof Error ? err.message : "Could not render chart.");
      }
    };
    void run();
    return () => { disposed = true; };
  }, [chart]);

  if (error) return <code>{`Mermaid error: ${error}`}</code>;
  return (
    <div className="mermaid-wrap">
      <div ref={containerRef} className="mermaid-diagram" />
    </div>
  );
}

// ─── canvas contexts ──────────────────────────────────────────────────────────

// read-only flag for the current canvas instance
const CanvasReadOnlyCtx = createContext(false);

// stable setters — never change after mount; node components read only this
type DesignMutators = {
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
};
const DesignMutatorsCtx = createContext<DesignMutators | null>(null);

// live canvas data — changes when nodes/edges change
type DesignData = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
};
const DesignDataCtx = createContext<DesignData | null>(null);

// ─── DesignStateProvider ──────────────────────────────────────────────────────
// Owns canvas state so that dragging nodes never re-renders App.

function DesignStateProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(INITIAL_EDGES);

  // setNodes/setEdges are stable (from useState) — memo with [] is fine
  const mutators = useMemo<DesignMutators>(
    () => ({ setNodes, setEdges }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const data = useMemo<DesignData>(
    () => ({ nodes, edges, onNodesChange, onEdgesChange }),
    [nodes, edges, onNodesChange, onEdgesChange],
  );

  return (
    <DesignMutatorsCtx.Provider value={mutators}>
      <DesignDataCtx.Provider value={data}>{children}</DesignDataCtx.Provider>
    </DesignMutatorsCtx.Provider>
  );
}

// ─── custom node components ───────────────────────────────────────────────────

const CustomNode = memo(function CustomNode({ id, data }: NodeProps) {
  const readOnly = useContext(CanvasReadOnlyCtx);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { setNodes, setEdges } = useContext(DesignMutatorsCtx)!;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label as string);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, label: trimmed || (data.label as string) } }
          : n,
      ),
    );
    setIsEditing(false);
  }, [editValue, id, setNodes, data.label]);

  const handleDelete = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [id, setNodes, setEdges],
  );

  return (
    <div className="custom-node" style={{ background: data.color as string }}>
      <Handle type="target" position={Position.Top} />
      <div className="custom-node-body">
        {isEditing ? (
          <input
            ref={inputRef}
            className="custom-node-input nodrag nopan"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") {
                setEditValue(data.label as string);
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <span
            className="custom-node-label"
            title={readOnly ? undefined : "Double-click to rename"}
            onDoubleClick={
              readOnly
                ? undefined
                : () => {
                    setEditValue(data.label as string);
                    setIsEditing(true);
                  }
            }
          >
            {data.label as string}
          </span>
        )}
        {!readOnly && (
          <button className="node-delete-btn" onClick={handleDelete} title="Delete">
            ×
          </button>
        )}
      </div>
      <span className="custom-node-type">{data.nodeType as string}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

const nodeTypes = { custom: CustomNode };

// ─── ChatBubble ───────────────────────────────────────────────────────────────
// memo'd: skips ReactMarkdown re-parse when only chatInput changes

const ChatBubble = memo(function ChatBubble({
  role,
  content,
  showLoading,
}: {
  role: ChatRole;
  content: string;
  showLoading: boolean;
}) {
  return (
    <Paper className={`bubble ${role}`} variant="outlined">
      <div className="bubble-header">
        <Typography variant="caption" className="bubble-title">
          {roleLabel(role)}
        </Typography>
      </div>
      <div>
        <ReactMarkdown>{content || (showLoading ? "..." : "")}</ReactMarkdown>
      </div>
    </Paper>
  );
});

// ─── DesignCanvasInner ────────────────────────────────────────────────────────
// memo'd: only re-renders from context (canvas state) changes, not from
// App re-renders caused by the editor or cursor.

const DesignCanvasInner = memo(function DesignCanvasInner({
  readOnly = false,
  showSim = false,
}: {
  readOnly?: boolean;
  showSim?: boolean;
}) {
  const canSim = !readOnly || showSim;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { nodes, edges, onNodesChange, onEdgesChange } = useContext(DesignDataCtx)!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { setNodes, setEdges } = useContext(DesignMutatorsCtx)!;
  const { screenToFlowPosition } = useReactFlow();

  const [isSimulating, setIsSimulating] = useState(false);
  const [simLog, setSimLog] = useState<SimLogEntry[]>([]);
  const [simStartNodeId, setSimStartNodeId] = useState("");
  const simTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Per-canvas simulation overlay — does not touch shared node/edge state.
  const [simOverlayActive, setSimOverlayActive] = useState<Set<string>>(new Set());
  const [simOverlayDone, setSimOverlayDone] = useState<Set<string>>(new Set());
  const [simOverlayEdges, setSimOverlayEdges] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (simStartNodeId && !nodes.find((n) => n.id === simStartNodeId))
      setSimStartNodeId("");
  }, [nodes, simStartNodeId]);

  useEffect(() => () => simTimeoutsRef.current.forEach(clearTimeout), []);

  const resetStyles = useCallback(() => {
    setSimOverlayActive(new Set());
    setSimOverlayDone(new Set());
    setSimOverlayEdges(new Set());
  }, []);

  const stopSimulation = useCallback(() => {
    simTimeoutsRef.current.forEach(clearTimeout);
    simTimeoutsRef.current = [];
    setIsSimulating(false);
    setSimLog((prev) => [...prev, { text: "⏹ Stopped.", kind: "stop" }]);
    resetStyles();
  }, [resetStyles]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const label = PALETTE_ITEMS.find((p) => p.nodeType === nodeType)?.label ?? nodeType;
      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: "custom",
        position,
        data: { label, color: NODE_COLORS[nodeType] ?? "#fff", nodeType },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const runSimulation = useCallback(() => {
    if (nodes.length === 0 || isSimulating) return;

    const incomingTargets = new Set(edges.map((e) => e.target));
    const startNode =
      (simStartNodeId ? nodes.find((n) => n.id === simStartNodeId) : null) ??
      nodes.find((n) => n.id.startsWith("client")) ??
      nodes.find((n) => !incomingTargets.has(n.id)) ??
      nodes[0];

    type BFSLevel = {
      nodeIds: string[];
      labels: string[];
      edgeIds: string[];
      maxLatency: number;
    };
    const levels: BFSLevel[] = [];
    const visited = new Set<string>();
    let frontier = [startNode.id];

    while (frontier.length > 0) {
      const labels = frontier.map((id) =>
        String(nodes.find((n) => n.id === id)?.data.label ?? id),
      );
      const maxLatency = Math.max(
        ...frontier.map((id) => COMPONENT_LATENCY[id.split("-")[0]] ?? 10),
      );
      const outEdges = frontier.flatMap((id) =>
        edges.filter((e) => e.source === id && !visited.has(e.target)),
      );
      levels.push({ nodeIds: [...frontier], labels, edgeIds: outEdges.map((e) => e.id), maxLatency });
      frontier.forEach((id) => visited.add(id));
      frontier = [...new Set(outEdges.map((e) => e.target).filter((id) => !visited.has(id)))];
    }

    const EDGE_PAUSE = 380;
    const LEVEL_GAP = 200;
    let cumulativeMs = 0;
    let cumulativeDelay = 0;

    type ScheduledLevel = { level: BFSLevel; li: number; nodeAt: number; edgeAt: number; cumMs: number };
    const scheduled: ScheduledLevel[] = levels.map((level, li) => {
      const nodeAt = cumulativeDelay;
      const edgeAt = cumulativeDelay + EDGE_PAUSE;
      cumulativeMs += level.maxLatency;
      cumulativeDelay += EDGE_PAUSE + Math.max(500, level.maxLatency * 18) + LEVEL_GAP;
      return { level, li, nodeAt, edgeAt, cumMs: cumulativeMs };
    });

    const totalMs = cumulativeMs;
    const bottleneck = levels
      .flatMap((lv, li) =>
        lv.nodeIds.map((id, i) => ({
          id, label: lv.labels[i],
          lat: COMPONENT_LATENCY[id.split("-")[0]] ?? 10, li,
        })),
      )
      .sort((a, b) => b.lat - a.lat)[0];

    setIsSimulating(true);
    setSimLog([{ text: "▶ Broadcasting…", kind: "start" }]);

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    scheduled.forEach(({ level, li, nodeAt, edgeAt, cumMs }) => {
      timeouts.push(
        setTimeout(() => {
          setSimOverlayActive(new Set(level.nodeIds));
          if (li > 0) setSimOverlayDone((prev) => new Set([...prev, ...levels[li - 1].nodeIds]));
          const latNote = level.maxLatency > 0 ? ` +${level.maxLatency}ms` : "";
          setSimLog((prev) => [
            ...prev,
            { text: `→ ${level.labels.join(", ")}${latNote} — ${cumMs}ms total`, kind: "hop" },
          ]);
        }, nodeAt),
      );

      if (level.edgeIds.length > 0) {
        timeouts.push(
          setTimeout(() => {
            setSimOverlayEdges((prev) => new Set([...prev, ...level.edgeIds]));
            setSimLog((prev) => [
              ...prev,
              { text: `⇢ ${level.edgeIds.length} message${level.edgeIds.length > 1 ? "s" : ""} sent`, kind: "edge" },
            ]);
          }, edgeAt),
        );
      }
    });

    timeouts.push(
      setTimeout(() => {
        const last = levels[levels.length - 1];
        if (last) setSimOverlayDone((prev) => new Set([...prev, ...last.nodeIds]));
        setSimOverlayActive(new Set());
      }, cumulativeDelay),
    );

    timeouts.push(
      setTimeout(() => {
        resetStyles();
        setIsSimulating(false);
        setSimLog((prev) => [
          ...prev,
          { text: `✓ Complete — ${totalMs}ms`, kind: "done" },
          ...(bottleneck && bottleneck.lat > 0
            ? [{ text: `⚡ Bottleneck: ${bottleneck.label} (${bottleneck.lat}ms)`, kind: "stat" as const }]
            : []),
        ]);
        simTimeoutsRef.current = [];
      }, cumulativeDelay + 800),
    );

    simTimeoutsRef.current = timeouts;
  }, [nodes, edges, isSimulating, simStartNodeId, resetStyles]);

  // When not simulating, pass nodes/edges through unchanged — no new objects for ReactFlow to reconcile.
  const displayNodes = useMemo(() => {
    if (!isSimulating) return nodes;
    return nodes.map((n) => ({
      ...n,
      className: simOverlayActive.has(n.id) ? "node-active" : simOverlayDone.has(n.id) ? "node-done" : "",
      style: simOverlayActive.has(n.id) || simOverlayDone.has(n.id) ? { opacity: 1 } : { opacity: 0.3 },
    }));
  }, [nodes, simOverlayActive, simOverlayDone, isSimulating]);

  const displayEdges = useMemo(() => {
    if (simOverlayEdges.size === 0) return edges;
    return edges.map((e) => ({
      ...e,
      animated: simOverlayEdges.has(e.id),
      style: simOverlayEdges.has(e.id) ? { stroke: "#f59e0b", strokeWidth: 2.5 } : undefined,
    }));
  }, [edges, simOverlayEdges]);

  return (
    <CanvasReadOnlyCtx.Provider value={readOnly}>
      <div className="design-canvas-wrap">
        {canSim && (
          <div className="sim-toolbar">
            <Select
              size="small"
              displayEmpty
              disabled={isSimulating || nodes.length === 0}
              value={simStartNodeId}
              onChange={(e) => setSimStartNodeId(e.target.value)}
              sx={{ fontSize: 12, minWidth: 130 }}
            >
              <MenuItem value=""><em>Auto (Client)</em></MenuItem>
              {nodes.map((n) => (
                <MenuItem key={n.id} value={n.id}>{n.data.label as string}</MenuItem>
              ))}
            </Select>
            <Button
              size="small"
              variant="contained"
              color="warning"
              disabled={nodes.length === 0 || isSimulating}
              onClick={runSimulation}
            >
              ▶ Simulate
            </Button>
            {isSimulating && (
              <Button size="small" variant="outlined" color="error" onClick={stopSimulation}>
                ■ Stop
              </Button>
            )}
            {!readOnly && (
              <Button
                size="small"
                variant="outlined"
                disabled={isSimulating || nodes.length === 0}
                onClick={() => { setNodes([]); setEdges([]); setSimLog([]); }}
              >
                Clear
              </Button>
            )}
          </div>
        )}
        <div className="design-canvas-main">
          <div className="design-flow">
            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
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
              defaultEdgeOptions={{ type: "smoothstep", interactionWidth: 20, style: { strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } }}
              snapToGrid
              snapGrid={[40, 40]}
              fitView
            >
              <Background variant={BackgroundVariant.Lines} gap={40} color="#e2e8f0" />
              <Controls />
              <MiniMap zoomable pannable nodeStrokeWidth={3} />
            </ReactFlow>
          </div>
          {canSim && simLog.length > 0 && (
            <div className="sim-log">
              {simLog.map((entry, i) => (
                <div key={i} className={`sim-log-line sim-log-${entry.kind}`}>
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
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("application/reactflow", item.nodeType);
                  }}
                  style={{ background: NODE_COLORS[item.nodeType] }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </CanvasReadOnlyCtx.Provider>
  );
});

// ─── App ──────────────────────────────────────────────────────────────────────

const EDITOR_INITIAL = [
  "## SOAP Notes — Child Alert System",
  "",
  "### S - Subjective",
  "- User request: Build a digital incident-reporting and alert system for field workers at BrightPath NGO",
  "- Context and intent: Replace unreliable WhatsApp group messages with a structured, trackable alert flow",
  "- Goals in plain language: Field workers log incidents → case managers and supervisors are notified instantly → responses are tracked and stored",
  "",
  "### O - Objective",
  "- Known requirements:",
  "  - Mobile-friendly incident submission for field workers",
  "  - Automatic notification to assigned case manager and supervisor",
  "  - Acknowledgement tracking with escalation for missed alerts",
  "  - Persistent audit log of all incidents and responses",
  "- Constraints:",
  "  - Field workers may have low-end Android devices and intermittent connectivity",
  "  - NGO has limited server budget — keep infrastructure simple",
  "- Facts observed from source:",
  "  - Current process: WhatsApp → missed messages → no audit trail",
  "  - Stakeholders: field workers, case managers, supervisors, NGO director",
  "",
  "### A - Assessment",
  "- Interpretation: Core system is an event-driven notification pipeline — an incident triggers a broadcast to multiple recipients",
  "- Key assumptions:",
  "  - Each child has an assigned case manager and supervisor stored in the database",
  "  - Notifications can be sent via push notification or SMS",
  "  - Escalation window is configurable (e.g., 30 minutes before re-alert)",
  "- Trade-offs considered:",
  "  - Queue vs direct call: Queue adds resilience but introduces delivery latency",
  "  - Push vs SMS: Push is free but requires app; SMS has cost but works on any phone",
  "",
  "### P - Plan",
  "1. Define the incident submission API endpoint and payload schema",
  "2. Design the notification broadcast flow (Broadcast → Queue → Notification Server)",
  "3. Decide escalation logic and storage model for acknowledgements",
  "4. Confirm alert delivery channels (push, SMS, or both)",
  "",
  "### System Design",
  "```mermaid",
  "flowchart TD",
  "  A[Field Worker App] --> B[API Gateway]",
  "  B --> C[Incident Server]",
  "  C --> D[(Incident DB)]",
  "  C --> E[Alert Queue]",
  "  E --> F[Notification Server]",
  "  F --> D",
  "```",
].join("\n");

const renderedSourceMarkdown = (() => {
  const trimmed = sourceMarkdown.trim();
  const match = trimmed.match(/^```(?:md|markdown)?\n([\s\S]*?)\n```$/i);
  return (match ? match[1] : sourceMarkdown)
    .replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, "")
    .trim();
})();

function App() {
  const [viewMode, setViewMode] = useState<"client" | "admin">("client");
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GROQ_API_KEY ?? "");
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm Sarah, program director at BrightPath NGO. We work with at-risk children and I'm hoping you can help us design a better system for our field teams. Add your Groq API key whenever you're ready, and feel free to ask me about the problem we're facing.",
    },
    {
      role: "user",
      content: "Hi Sarah! Can you walk me through the main problem you're trying to solve?",
    },
    {
      role: "assistant",
      content: "Of course! Right now, when a field worker visits a child and notices something concerning — signs of neglect, an unsafe home, anything like that — they send a message in a WhatsApp group. The problem is the group has too many people, messages get buried, and there's no way to know if the right case manager actually saw it or is taking action. Sometimes alerts go unnoticed for a whole day. On top of that, when our NGO director has to report to donors or the government, we have no proper records — just old chat messages. It's really not working for us anymore.",
    },
    {
      role: "user",
      content: "How many field workers and case managers are we dealing with? I need to understand the scale before proposing a design.",
    },
    {
      role: "assistant",
      content: "We have about 40 field workers spread across three districts, and 12 case managers — each case manager is responsible for a group of field workers and their assigned children. On top of that, there are 3 supervisors who oversee everything and need to be looped in on high-severity incidents. On a busy day we might get 15 to 20 incident reports. It's not a huge volume, but the problem is that even one missed alert can have serious consequences for a child.",
    },
  ]);

  const [editorMarkdown, setEditorMarkdown] = useState(EDITOR_INITIAL);
  const [previewMarkdown, setPreviewMarkdown] = useState(EDITOR_INITIAL);

  const [leftTab, setLeftTab] = useState(0);
  const [editorMode, setEditorMode] = useState<"split" | "editor" | "preview">("split");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLPreElement | null>(null);

  // Cheap char count — avoids building the full conversation string on every chunk.
  const conversationLength = useMemo(
    () => messages.reduce((sum, m) => sum + m.content.length, 0),
    [messages],
  );

  const lineCount = useMemo(
    () => Math.max(1, editorMarkdown.split("\n").length),
    [editorMarkdown],
  );
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount],
  );
  const wordCount = useMemo(
    () => editorMarkdown.trim().split(/\s+/).filter(Boolean).length,
    [editorMarkdown],
  );

  const markdownComponents = useMemo(
    () => ({
      code: ({
        inline,
        className,
        children,
        ...props
      }: {
        inline?: boolean;
        className?: string;
        children?: ReactNode;
      }) => {
        const language = className?.replace("language-", "") ?? "";
        const codeText = String(children ?? "").replace(/\n$/, "");
        if (!inline && language === "mermaid") return <MermaidBlock chart={codeText} />;
        return <code className={className} {...props}>{children}</code>;
      },
    }),
    [],
  );

  const updateCursorFromPosition = useCallback((value: string, position: number) => {
    const bounded = Math.max(0, Math.min(position, value.length));
    const head = value.slice(0, bounded);
    const line = head.split("\n").length;
    const lastBreak = head.lastIndexOf("\n");
    setCursor({ line, column: bounded - lastBreak });
  }, []);

  const withEditorSelection = useCallback(
    (
      transform: (
        value: string,
        selectionStart: number,
        selectionEnd: number,
      ) => { nextValue: string; nextSelectionStart: number; nextSelectionEnd: number },
    ) => {
      const editor = editorRef.current;
      if (!editor) return;
      const { selectionStart, selectionEnd, value } = editor;
      const { nextValue, nextSelectionStart, nextSelectionEnd } = transform(
        value, selectionStart, selectionEnd,
      );
      setEditorMarkdown(nextValue);
      requestAnimationFrame(() => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(nextSelectionStart, nextSelectionEnd);
        updateCursorFromPosition(nextValue, nextSelectionEnd);
      });
    },
    [updateCursorFromPosition],
  );

  const wrapSelection = useCallback(
    (before: string, after = before, fallback = "text") => {
      withEditorSelection((value, start, end) => {
        const selected = value.slice(start, end) || fallback;
        const nextValue = value.slice(0, start) + before + selected + after + value.slice(end);
        return {
          nextValue,
          nextSelectionStart: start + before.length,
          nextSelectionEnd: start + before.length + selected.length,
        };
      });
    },
    [withEditorSelection],
  );

  const insertSnippet = useCallback(
    (snippet: string) => {
      withEditorSelection((value, start, end) => {
        const nextValue = value.slice(0, start) + snippet + value.slice(end);
        const pos = start + snippet.length;
        return { nextValue, nextSelectionStart: pos, nextSelectionEnd: pos };
      });
    },
    [withEditorSelection],
  );

  const handleEditorScroll = useCallback(() => {
    const editor = editorRef.current;
    const lines = lineNumbersRef.current;
    if (editor && lines) lines.scrollTop = editor.scrollTop;
  }, []);

  const handleCompile = useCallback(() => {
    setPreviewMarkdown(editorMarkdown);
  }, [editorMarkdown]);

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      insertSnippet("  ");
    },
    [insertSnippet],
  );

  const sendMessage = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const trimmedPrompt = chatInput.trim();
      if (!trimmedPrompt || isSending) return;

      if (!apiKey.trim()) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Please provide a Groq API key first." },
        ]);
        return;
      }

      const userMessage: ChatMessage = { role: "user", content: trimmedPrompt };
      setChatInput("");
      setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
      setIsSending(true);

      try {
        const groq = new Groq({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true });
        const completion = await groq.chat.completions.create({
          messages: [{ role: "system", content: defaultSystemPrompt }, ...messages, userMessage],
          model: "llama-3.3-70b-versatile",
          temperature: 1,
          max_completion_tokens: 8000,
          top_p: 1,
          stream: true,
        });

        for await (const chunk of completion) {
          const part = chunk.choices[0]?.delta?.content ?? "";
          if (!part) continue;
          setMessages((prev) => {
            const next = [...prev];
            const last = next.length - 1;
            if (last >= 0 && next[last].role === "assistant")
              next[last] = { ...next[last], content: next[last].content + part };
            return next;
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) => {
          const next = [...prev];
          const last = next.length - 1;
          if (last >= 0 && next[last].role === "assistant")
            next[last] = { role: "assistant", content: `Request failed: ${msg}` };
          return next;
        });
      } finally {
        setIsSending(false);
      }
    },
    [chatInput, isSending, apiKey, messages],
  );

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <DesignStateProvider>
        <main className="app-shell">
          <header className="app-topbar">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Design_IT</Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              color="primary"
              value={viewMode}
              onChange={(_e, v) => { if (v) setViewMode(v); }}
            >
              <ToggleButton value="client">Client View</ToggleButton>
              <ToggleButton value="admin">Admin View</ToggleButton>
            </ToggleButtonGroup>
          </header>

          {viewMode === "client" ? (
            <section className="workspace-grid">
              {/* ── left: context / chat ── */}
              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Tabs
                    value={leftTab}
                    onChange={(_e, v) => setLeftTab(v as number)}
                    textColor="primary"
                    indicatorColor="primary"
                  >
                    <Tab label="Context" />
                    <Tab label="Chat" />
                  </Tabs>
                  {leftTab === 1 && (
                    <TextField
                      className="api-key"
                      type="password"
                      size="small"
                      label="Groq API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  )}
                </header>
                <Divider />
                {leftTab === 0 && (
                  <div className="panel-body markdown-body scrollable">
                    <ReactMarkdown components={markdownComponents}>
                      {renderedSourceMarkdown}
                    </ReactMarkdown>
                  </div>
                )}
                {leftTab === 1 && (
                  <div className="chat-panel-main">
                    <div className="chat-log scrollable" aria-live="polite">
                      {messages.map((message, index) => (
                        <ChatBubble
                          key={`${message.role}-${index}`}
                          role={message.role}
                          content={message.content}
                          showLoading={isSending && index === messages.length - 1}
                        />
                      ))}
                    </div>
                    <form className="chat-input" onSubmit={sendMessage}>
                      <TextField
                        multiline
                        minRows={3}
                        maxRows={6}
                        placeholder="Ask something..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                      />
                      <div className="chat-actions">
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={isSending || !chatInput.trim()}
                        >
                          {isSending ? "Streaming..." : "Send"}
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                          {conversationLength} chars
                        </Typography>
                      </div>
                    </form>
                  </div>
                )}
              </Paper>

              {/* ── center: markdown editor ── */}
              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Markdown Editor
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button size="small" variant="contained" color="primary" onClick={handleCompile}>
                      Compile
                    </Button>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      color="primary"
                      value={editorMode}
                      onChange={(_e, v) => { if (v) setEditorMode(v); }}
                    >
                      <ToggleButton value="editor">Editor</ToggleButton>
                      <ToggleButton value="split">Split</ToggleButton>
                      <ToggleButton value="preview">Preview</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </header>
                <Divider />
                <div className="panel-body editor-layout">
                  <Box className="editor-toolbar">
                    <Button size="small" variant="outlined" onClick={() => insertSnippet("# ")}>H1</Button>
                    <Button size="small" variant="outlined" onClick={() => insertSnippet("## ")}>H2</Button>
                    <Button size="small" variant="outlined" onClick={() => wrapSelection("**")}>Bold</Button>
                    <Button size="small" variant="outlined" onClick={() => wrapSelection("_")}>Italic</Button>
                    <Button size="small" variant="outlined" onClick={() => wrapSelection("`")}>Code</Button>
                    <Button size="small" variant="outlined" onClick={() => wrapSelection("[", "](https://)", "label")}>Link</Button>
                    <Button size="small" variant="outlined" onClick={() => insertSnippet("- ")}>List</Button>
                    <Button size="small" variant="outlined" onClick={() => insertSnippet("> ")}>Quote</Button>
                    <Button size="small" variant="outlined" onClick={() => insertSnippet("- [ ] ")}>Task</Button>
                    <Button size="small" variant="outlined" onClick={() => insertSnippet("\n```md\nYour code here\n```\n")}>Fence</Button>
                  </Box>

                  <Box className={`editor-content mode-${editorMode}`}>
                    {editorMode !== "preview" && (
                      <div className="editor-shell">
                        <pre ref={lineNumbersRef} className="line-numbers" aria-hidden="true">
                          {lineNumbers}
                        </pre>
                        <textarea
                          ref={editorRef}
                          className="editor"
                          value={editorMarkdown}
                          onChange={(e) => {
                            setEditorMarkdown(e.target.value);
                            updateCursorFromPosition(e.target.value, e.target.selectionStart);
                          }}
                          onClick={(e) => updateCursorFromPosition(e.currentTarget.value, e.currentTarget.selectionStart)}
                          onKeyUp={(e) => updateCursorFromPosition(e.currentTarget.value, e.currentTarget.selectionStart)}
                          onKeyDown={handleEditorKeyDown}
                          onScroll={handleEditorScroll}
                          spellCheck={false}
                        />
                      </div>
                    )}
                    {editorMode !== "editor" && (
                      <div className="preview markdown-body scrollable">
                        <ReactMarkdown components={markdownComponents}>
                          {previewMarkdown}
                        </ReactMarkdown>
                      </div>
                    )}
                  </Box>

                  <div className="editor-status">
                    <span>Ln {cursor.line}, Col {cursor.column}</span>
                    <span>{wordCount} words</span>
                    <span>{editorMarkdown.length} chars</span>
                  </div>
                </div>
              </Paper>

              {/* ── right: system design ── */}
              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    System Design
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    drag components onto the canvas
                  </Typography>
                </header>
                <Divider />
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <ReactFlowProvider>
                    <DesignCanvasInner />
                  </ReactFlowProvider>
                </div>
              </Paper>
            </section>
          ) : (
            <section className="admin-grid">
              {/* ── left: chat history ── */}
              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Chat History</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {messages.length} messages
                  </Typography>
                </header>
                <Divider />
                <div className="panel-body admin-panel-body">
                  <div className="chat-log scrollable admin-chat-log" aria-live="polite">
                    {messages.map((message, index) => (
                      <ChatBubble
                        key={`${message.role}-${index}`}
                        role={message.role}
                        content={message.content}
                        showLoading={false}
                      />
                    ))}
                  </div>
                </div>
              </Paper>

              {/* ── center: rendered markdown ── */}
              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Rendered Markdown</Typography>
                  <Typography variant="caption" color="text.secondary">Live markdown render</Typography>
                </header>
                <Divider />
                <div className="panel-body admin-panel-body">
                  <div className="preview markdown-body scrollable admin-preview">
                    <ReactMarkdown components={markdownComponents}>
                      {previewMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>
              </Paper>

              {/* ── right: system design (read-only) ── */}
              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>System Design</Typography>
                </header>
                <Divider />
                <ReactFlowProvider>
                  <DesignCanvasInner readOnly showSim />
                </ReactFlowProvider>
              </Paper>
            </section>
          )}
        </main>
      </DesignStateProvider>
    </ThemeProvider>
  );
}

export default App;
