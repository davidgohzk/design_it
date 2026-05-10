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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  SvgIcon,
  Divider,
  Paper,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
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
type FloatingQuote = { text: string; top: number; left: number };
type ChatFloatingQuote = FloatingQuote & { index: number };
type PanelWidths = [number, number, number];
type LandingSlide = {
  problem: string;
  country: string;
  image: string;
  alt: string;
  backgroundPosition?: string;
  introColor: string;
  verbColor: string;
  problemColor: string;
  countryColor: string;
};
type ResizeState = {
  view: "client" | "admin";
  handleIndex: 0 | 1;
  startX: number;
  startWidths: PanelWidths;
  containerWidth: number;
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
    fontSize: 14,
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    h6: { fontSize: "1.06rem", lineHeight: 1.22, fontWeight: 700 },
    subtitle1: { fontSize: "0.98rem", lineHeight: 1.28, fontWeight: 700 },
    body1: { fontSize: "0.92rem", lineHeight: 1.58 },
    body2: { fontSize: "0.88rem", lineHeight: 1.52 },
    caption: { fontSize: "0.74rem", lineHeight: 1.4 },
    button: { textTransform: "none", fontWeight: 600 },
  },
});

// ─── constants ────────────────────────────────────────────────────────────────

const defaultSystemPrompt = `You are Sarah, a program director at BrightPath, an NGO that supports vulnerable children in urban communities. You are not a developer — you are a non-technical manager who needs a system built.

Your field workers currently use WhatsApp to report incidents involving at-risk children. Messages get lost, case managers miss alerts, and there is no way to track whether an alert was acknowledged or acted upon.

You want a digital system where field workers can log an incident, and the system automatically notifies the right case managers and supervisors based on the child's assigned case. You want to know that alerts are received, and you want a record of every incident and response.

A developer will ask you questions to clarify requirements and design the system. Respond like a real non-technical client: explain your problems in plain language, answer questions based on your experience, and help the developer understand what matters most to your team.`;

const LANDING_SLIDES: LandingSlide[] = [
  {
    problem: "Children's Literacy",
    country: "Thailand",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Thai-school-classroom%20P9180137.jpg",
    alt: "A classroom in a Thai village school",
    introColor: "#ffffff",
    verbColor: "#60a5fa",
    problemColor: "#ffffff",
    countryColor: "#ef4444",
  },
  {
    problem: "Women's Education",
    country: "Afghanistan",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Afghan%20textbooks%20in%20Pashto.jpg",
    alt: "Afghan textbooks used in education",
    introColor: "#ffffff",
    verbColor: "#ef4444",
    problemColor: "#ffffff",
    countryColor: "#22c55e",
  },
  {
    problem: "Environmental Sustainability",
    country: "Colombia",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Grey-breasted%20mountain%20toucan%20%28Andigena%20hypoglauca%29%20Caldas.jpg",
    alt: "A toucan perched in the Colombian forest",
    backgroundPosition: "center 24%",
    introColor: "#facc15",
    verbColor: "#60a5fa",
    problemColor: "#facc15",
    countryColor: "#ef4444",
  },
];

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

const PANEL_HANDLE_WIDTH = 14;
const MIN_PANEL_WIDTH = 280;
const DEFAULT_PANEL_WIDTHS: PanelWidths = [1, 1, 1];

// ─── helpers ──────────────────────────────────────────────────────────────────

const roleLabel = (role: ChatRole) => (role === "user" ? "You" : "Grok");
const normalizeQuoteText = (text: string) => text.replace(/\s+/g, " ").trim();
const escapeMarkdownTitle = (text: string) =>
  normalizeQuoteText(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const escapeMermaidLabel = (text: string) =>
  normalizeQuoteText(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const panelGridTemplate = (widths: PanelWidths) =>
  `minmax(0, ${widths[0]}fr) ${PANEL_HANDLE_WIDTH}px minmax(0, ${widths[1]}fr) ${PANEL_HANDLE_WIDTH}px minmax(0, ${widths[2]}fr)`;
const getQuotePosition = (rect: DOMRect) => {
  const popupWidth = 88;
  const viewportPadding = 12;
  const centeredLeft = rect.left + rect.width / 2;

  return {
    top: Math.max(12, rect.top - 44),
    left: clamp(
      centeredLeft,
      viewportPadding + popupWidth / 2,
      window.innerWidth - viewportPadding - popupWidth / 2,
    ),
  };
};
const getLandingOffset = (index: number, activeIndex: number, total: number) => {
  const diff = (index - activeIndex + total) % total;
  if (diff === 0) return 0;
  if (diff === 1) return 1;
  return -1;
};

const canonicalizeSearchChar = (char: string) => {
  if (/\s/.test(char)) return " ";
  if ("-–—―".includes(char)) return "-";
  if ("'‘’‚‛".includes(char)) return "'";
  if ("\"“”„‟".includes(char)) return "\"";
  return char.toLowerCase();
};

function buildNormalizedSearchText(rawText: string) {
  let text = "";
  const indexMap: number[] = [];

  for (let i = 0; i < rawText.length; i += 1) {
    const normalizedChar = canonicalizeSearchChar(rawText[i]);
    if (normalizedChar === " ") {
      if (!text || text.endsWith(" ")) continue;
    }
    text += normalizedChar;
    indexMap.push(i);
  }

  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    indexMap.pop();
  }

  return { text, indexMap };
}

function flashTextMatch(container: HTMLElement, targetText: string, className: string) {
  const normalizedTarget = buildNormalizedSearchText(targetText).text;
  if (!normalizedTarget) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: globalThis.Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const rawText = textNode.textContent ?? "";
    const normalizedNode = buildNormalizedSearchText(rawText);
    const normalizedMatchStart = normalizedNode.text.indexOf(normalizedTarget);
    const directStart = rawText.indexOf(targetText);
    const matchStart =
      directStart >= 0
        ? directStart
        : normalizedMatchStart >= 0
          ? normalizedNode.indexMap[normalizedMatchStart]
          : -1;

    if (matchStart < 0) continue;

    const matchEnd =
      directStart >= 0
        ? matchStart + targetText.length
        : normalizedNode.indexMap[normalizedMatchStart + normalizedTarget.length - 1] + 1;
    const matchText = rawText.slice(matchStart, matchEnd);
    const before = rawText.slice(0, matchStart);
    const after = rawText.slice(matchEnd);
    const mark = document.createElement("mark");
    mark.className = className;
    mark.textContent = matchText;

    const parent = textNode.parentNode;
    if (!parent) return null;

    parent.insertBefore(document.createTextNode(before), textNode);
    parent.insertBefore(mark, textNode);
    parent.insertBefore(document.createTextNode(after), textNode);
    parent.removeChild(textNode);
    mark.scrollIntoView({ behavior: "smooth", block: "center" });

    return () => {
      if (mark.parentNode) {
        mark.parentNode.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
      }
    };
  }

  return null;
}

function flashElementClass(element: HTMLElement, className: string) {
  element.classList.add(className);
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  return () => element.classList.remove(className);
}

type LandingIconName =
  | "brief"
  | "chat"
  | "soap"
  | "architecture"
  | "agent"
  | "interview"
  | "community"
  | "premium"
  | "challenge";

function LandingIcon({ name }: { name: LandingIconName }) {
  const paths: Record<LandingIconName, ReactNode> = {
    brief: (
      <>
        <path d="M6 4h9l3 3v13H6z" />
        <path d="M15 4v4h4" />
        <path d="M8.5 11h7" />
        <path d="M8.5 14h7" />
        <path d="M8.5 17h4" />
      </>
    ),
    chat: (
      <>
        <path d="M5 6h14v9H9l-4 4z" />
        <path d="M8 10h8" />
        <path d="M8 13h5" />
      </>
    ),
    soap: (
      <>
        <path d="M6 4h12v16H6z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h3" />
      </>
    ),
    architecture: (
      <>
        <path d="M5 6h5v5H5z" />
        <path d="M14 6h5v5h-5z" />
        <path d="M9 15h6v5H9z" />
        <path d="M10 9h4" />
        <path d="M12 11v4" />
      </>
    ),
    agent: (
      <>
        <path d="M8 8h8v8H8z" />
        <path d="M12 4v4" />
        <path d="M12 16v4" />
        <path d="M4 12h4" />
        <path d="M16 12h4" />
        <path d="M10.5 11h.01" />
        <path d="M13.5 11h.01" />
      </>
    ),
    interview: (
      <>
        <path d="M5 7h8v6H8l-3 3z" />
        <path d="M11 11h8v6h-3l-3 3v-3h-2z" />
      </>
    ),
    community: (
      <>
        <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M4 20v-2a4 4 0 0 1 8 0v2" />
        <path d="M12 20v-2a4 4 0 0 1 8 0v2" />
      </>
    ),
    premium: <path d="M12 4l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" />,
    challenge: (
      <>
        <path d="M6 5h12v14H6z" />
        <path d="M9 9h6" />
        <path d="M9 13h6" />
        <path d="M9 17h3" />
        <path d="M18 7l2-2" />
        <path d="M18 17l2 2" />
      </>
    ),
  };

  return (
    <SvgIcon className="landing-icon" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </SvgIcon>
  );
}

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
  index,
  onQuote,
  onSelectionQuote,
  onDismissSelectionQuote,
}: {
  role: ChatRole;
  content: string;
  showLoading: boolean;
  index?: number;
  onQuote?: (text: string, index: number) => void;
  onSelectionQuote?: (text: string, index: number, rect: DOMRect) => void;
  onDismissSelectionQuote?: () => void;
}) {
  const handleMouseUp = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!onSelectionQuote || index === undefined || role === "system") return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        onDismissSelectionQuote?.();
        return;
      }

      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      if (!anchorNode || !focusNode) {
        onDismissSelectionQuote?.();
        return;
      }

      const container = event.currentTarget;
      if (!container.contains(anchorNode) || !container.contains(focusNode)) {
        onDismissSelectionQuote?.();
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      onSelectionQuote(selection.toString().trim(), index, rect);
    },
    [index, onDismissSelectionQuote, onSelectionQuote, role],
  );

  return (
    <Paper
      id={index !== undefined ? `chat-msg-${index}` : undefined}
      className={`bubble ${role}`}
      variant="outlined"
      onMouseUp={handleMouseUp}
    >
      <div className="bubble-header">
        <Typography variant="caption" className="bubble-title">
          {roleLabel(role)}
        </Typography>
        {role !== "system" && onQuote !== undefined && index !== undefined && (
          <div className="bubble-actions">
            <IconButton
              size="small"
              title="Quote this message in editor"
              onClick={() => onQuote(content, index)}
              sx={{ padding: "2px", fontSize: "0.8rem", lineHeight: 1 }}
            >
              ❝
            </IconButton>
          </div>
        )}
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
  title = "System Design",
  subtitle,
  simStartNodeId,
  setSimStartNodeId,
}: {
  readOnly?: boolean;
  showSim?: boolean;
  title?: string;
  subtitle?: string;
  simStartNodeId: string;
  setSimStartNodeId: Dispatch<SetStateAction<string>>;
}) {
  const canSim = !readOnly || showSim;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { nodes, edges, onNodesChange, onEdgesChange } = useContext(DesignDataCtx)!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { setNodes, setEdges } = useContext(DesignMutatorsCtx)!;
  const { screenToFlowPosition } = useReactFlow();

  const [isSimulating, setIsSimulating] = useState(false);
  const [isMermaidOpen, setIsMermaidOpen] = useState(false);
  const [isSimLogOpen, setIsSimLogOpen] = useState(true);
  const [simLog, setSimLog] = useState<SimLogEntry[]>([]);
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
    setIsSimLogOpen(true);
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

  const mermaidCode = useMemo(() => {
    const nodeAliases = new Map<string, string>();
    const nodeLines = nodes.map((node, index) => {
      const alias = `N${index + 1}`;
      nodeAliases.set(node.id, alias);
      return `  ${alias}["${escapeMermaidLabel(String(node.data.label ?? node.id))}"]`;
    });
    const edgeLines = edges
      .map((edge) => {
        const source = nodeAliases.get(edge.source);
        const target = nodeAliases.get(edge.target);
        if (!source || !target) return null;
        return `  ${source} --> ${target}`;
      })
      .filter((line): line is string => line !== null);

    return ["flowchart TD", ...nodeLines, ...edgeLines].join("\n");
  }, [edges, nodes]);

  const toolbar = canSim ? (
    <div className="sim-toolbar">
      <Select
        size="small"
        displayEmpty
        disabled={isSimulating || nodes.length === 0}
        value={simStartNodeId}
        onChange={(e) => setSimStartNodeId(e.target.value)}
        sx={{ fontSize: 12, minWidth: 112, flexShrink: 0 }}
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
          onClick={() => { setNodes([]); setEdges([]); setSimLog([]); }}
        >
          Clear
        </Button>
      )}
      {simLog.length > 0 && !isSimLogOpen && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => setIsSimLogOpen(true)}
        >
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
        {(title || toolbar) && (
          <div className="design-panel-header">
            <div className="design-panel-heading">
              {title && (
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </div>
            {toolbar}
          </div>
        )}
        {(title || toolbar) && <Divider />}
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
              <MiniMap
                zoomable
                pannable
                nodeStrokeWidth={2}
                style={{ width: 118, height: 76 }}
              />
            </ReactFlow>
          </div>
          {canSim && simLog.length > 0 && isSimLogOpen && (
            <div className="sim-log">
              <div className="sim-log-header">
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Simulation Log
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  onClick={() => setIsSimLogOpen(false)}
                  sx={{ minWidth: 0, padding: "2px 6px" }}
                >
                  Close
                </Button>
              </div>
              {simLog.map((entry, i) => (
                <div key={i} className={`sim-log-line sim-log-${entry.kind}`}>
                  {entry.text}
                </div>
              ))}
            </div>
          )}
        </div>
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
              slotProps={{
                htmlInput: {
                  readOnly: true,
                },
              }}
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
  "## SOAP Notes - Child Alert System",
  "",
  "### S - Subjective",
  "BrightPath needs a replacement for [WhatsApp group messages](#cs \"Alerts go unacknowledged, messages get buried, and there is no audit trail for donor or government reporting.\") because the current reporting flow is unreliable and hard to audit.",
  "",
  "In the client interview, Sarah explained that [alerts can go unnoticed for a whole day](#chat-msg-2 \"Sometimes alerts go unnoticed for a whole day.\") and that the team is left with [no proper records - just old chat messages](#chat-msg-2 \"we have no proper records - just old chat messages.\").",
  "",
  "The desired outcome is a system where field workers can submit incidents, the right staff are notified immediately, and every action is tracked for follow-up and reporting.",
  "",
  "### O - Objective",
  "- Mobile-friendly incident submission for field workers",
  "- Automatic notification to the assigned case manager and supervisor",
  "- Acknowledgement tracking with escalation when alerts are missed",
  "- Persistent audit log of incidents and responses",
  "- Scale reference: [about 40 field workers spread across three districts, and 12 case managers](#chat-msg-4 \"We have about 40 field workers spread across three districts, and 12 case managers\")",
  "- Device constraint: Field workers may have low-end Android devices and intermittent connectivity",
  "- Process constraint: Sarah needs us to [start simple, then gradually improve the design](#cs \"Start simple, then gradually improve the design\")",
  "",
  "### A - Assessment",
  "An event-driven alert pipeline is a good fit here because one submitted incident needs to fan out to multiple recipients while keeping an audit trail.",
  "",
  "That recommendation is grounded in the requirement that [the system immediately notifies the assigned case manager and supervisor](#cs \"The system immediately notifies the assigned case manager and supervisor\") and the fact that [even one missed alert can have serious consequences for a child](#chat-msg-4 \"even one missed alert can have serious consequences for a child.\")",
  "",
  "A queue is worth the extra moving part because delivery reliability matters more than shaving off a small amount of latency.",
  "",
  "### P - Plan",
  "1. Define the incident submission API endpoint and payload schema",
  "2. Design the notification broadcast flow (Broadcast -> Queue -> Notification Server)",
  "3. Store acknowledgements and escalation timestamps alongside each incident",
  "4. Confirm delivery channels for the first release",
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
  "",
  "### Design Justification",
  "This flow directly replaces the unreliable [WhatsApp group messages](#cs \"Alerts go unacknowledged, messages get buried, and there is no audit trail for donor or government reporting.\") process with a structured submission path from the field worker app into the incident system.",
  "",
  "The API Gateway and Incident Server give staff one clear way to log an incident, which is a better fit for Sarah's concern that [there's no way to know if the right case manager actually saw it or is taking action](#chat-msg-2 \"there's no way to know if the right case manager actually saw it or is taking action.\").",
  "",
  "The Alert Queue and Notification Server help the design fan alerts out reliably so the system can [immediately notify the assigned case manager and supervisor](#cs \"The system immediately notifies the assigned case manager and supervisor\") instead of leaving important updates buried in chat where [alerts go unnoticed for a whole day](#chat-msg-2 \"Sometimes alerts go unnoticed for a whole day.\").",
  "",
  "The Incident DB gives BrightPath a durable record of the incident, acknowledgement, and follow-up history, which addresses both the need for [all incidents and responses to be stored for audit and reporting](#cs \"All incidents and responses are stored for audit and reporting\") and Sarah's frustration that they currently have [no proper records - just old chat messages](#chat-msg-2 \"we have no proper records - just old chat messages.\").",
].join("\n");

const renderedSourceMarkdown = (() => {
  const trimmed = sourceMarkdown.trim();
  const match = trimmed.match(/^```(?:md|markdown)?\n([\s\S]*?)\n```$/i);
  return (match ? match[1] : sourceMarkdown)
    .replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, "")
    .trim();
})();

function App() {
  const [landingIndex, setLandingIndex] = useState(0);
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
  const [simStartNodeId, setSimStartNodeId] = useState("");
  const [clientPanelWidths, setClientPanelWidths] = useState<PanelWidths>(DEFAULT_PANEL_WIDTHS);
  const [adminPanelWidths, setAdminPanelWidths] = useState<PanelWidths>(DEFAULT_PANEL_WIDTHS);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLPreElement | null>(null);
  const caseStudyRef = useRef<HTMLDivElement | null>(null);
  const clientGridRef = useRef<HTMLElement | null>(null);
  const adminGridRef = useRef<HTMLElement | null>(null);
  const introSectionRef = useRef<HTMLElement | null>(null);
  const demoSectionRef = useRef<HTMLElement | null>(null);
  const [caseStudyQuote, setCaseStudyQuote] = useState<FloatingQuote | null>(null);
  const [chatQuote, setChatQuote] = useState<ChatFloatingQuote | null>(null);
  const [csHighlightText, setCsHighlightText] = useState<string | null>(null);
  const [chatHighlight, setChatHighlight] = useState<{ index: number; text?: string } | null>(null);

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

  useEffect(() => {
    if (leftTab !== 0 || !csHighlightText) return;

    let cleanup: null | (() => void) = null;
    let timer: null | ReturnType<typeof setTimeout> = null;
    let frame = 0;

    const runHighlight = (attemptsLeft: number) => {
      const container = caseStudyRef.current;
      if (!container) {
        if (attemptsLeft > 0) {
          frame = requestAnimationFrame(() => runHighlight(attemptsLeft - 1));
        }
        return;
      }

      cleanup =
        flashTextMatch(container, csHighlightText, "cs-text-highlight")
        ?? flashElementClass(container, "context-panel-highlight");

      timer = setTimeout(() => {
        cleanup?.();
        setCsHighlightText(null);
      }, 2500);
    };

    frame = requestAnimationFrame(() => runHighlight(8));

    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      cleanup?.();
    };
  }, [csHighlightText, leftTab]);

  useEffect(() => {
    if (leftTab !== 1 || !chatHighlight) return;

    const bubble = document.getElementById(`chat-msg-${chatHighlight.index}`) as HTMLElement | null;
    if (!bubble) return;

    bubble.scrollIntoView({ behavior: "smooth", block: "center" });
    const cleanup =
      chatHighlight.text
        ? flashTextMatch(bubble, chatHighlight.text, "chat-text-highlight")
        : null;

    if (!cleanup) bubble.classList.add("quote-highlight");

    const timer = setTimeout(() => {
      cleanup?.();
      bubble.classList.remove("quote-highlight");
      setChatHighlight(null);
    }, 2500);

    return () => {
      clearTimeout(timer);
      cleanup?.();
      bubble.classList.remove("quote-highlight");
    };
  }, [chatHighlight, leftTab]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLandingIndex((prev) => (prev + 1) % LANDING_SLIDES.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!resizeState) return;

    const applyResize = (event: globalThis.MouseEvent) => {
      const delta = event.clientX - resizeState.startX;
      const totalFlexibleWidth = Math.max(1, resizeState.containerWidth - PANEL_HANDLE_WIDTH * 2);
      const startTotal = resizeState.startWidths[0] + resizeState.startWidths[1] + resizeState.startWidths[2];
      const startPixels = resizeState.startWidths.map(
        (width) => (width / startTotal) * totalFlexibleWidth,
      ) as PanelWidths;

      const nextPixels = [...startPixels] as PanelWidths;

      if (resizeState.handleIndex === 0) {
        const combined = startPixels[0] + startPixels[1];
        if (combined <= MIN_PANEL_WIDTH * 2) return;
        nextPixels[0] = clamp(startPixels[0] + delta, MIN_PANEL_WIDTH, combined - MIN_PANEL_WIDTH);
        nextPixels[1] = combined - nextPixels[0];
      } else {
        const combined = startPixels[1] + startPixels[2];
        if (combined <= MIN_PANEL_WIDTH * 2) return;
        nextPixels[1] = clamp(startPixels[1] + delta, MIN_PANEL_WIDTH, combined - MIN_PANEL_WIDTH);
        nextPixels[2] = combined - nextPixels[1];
      }

      if (resizeState.view === "client") setClientPanelWidths(nextPixels);
      else setAdminPanelWidths(nextPixels);
    };

    const stopResize = () => setResizeState(null);

    document.body.classList.add("is-resizing-panels");
    window.addEventListener("mousemove", applyResize);
    window.addEventListener("mouseup", stopResize);

    return () => {
      document.body.classList.remove("is-resizing-panels");
      window.removeEventListener("mousemove", applyResize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [resizeState]);

  const handleResizeStart = useCallback(
    (view: "client" | "admin", handleIndex: 0 | 1) =>
      (event: MouseEvent<HTMLDivElement>) => {
        if (window.innerWidth <= 1024) return;

        const container =
          view === "client" ? clientGridRef.current : adminGridRef.current;
        const widths = view === "client" ? clientPanelWidths : adminPanelWidths;
        if (!container) return;

        setResizeState({
          view,
          handleIndex,
          startX: event.clientX,
          startWidths: widths,
          containerWidth: container.getBoundingClientRect().width,
        });
        event.preventDefault();
      },
    [adminPanelWidths, clientPanelWidths],
  );

  const scrollToDemo = useCallback(() => {
    demoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToIntro = useCallback(() => {
    introSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
      a: ({
        href,
        title,
        children,
      }: {
        href?: string;
        title?: string;
        children?: ReactNode;
      }) => {
        if (href === "#cs") {
          return (
            <Tooltip title={title ? `"${title}"` : ""} arrow placement="top">
              <span
                className="inline-ref inline-ref-cs"
                role="link"
                tabIndex={0}
                onClick={() => {
                  setLeftTab(0);
                  setCsHighlightText(title ?? null);
                }}
              >
                {children}
              </span>
            </Tooltip>
          );
        }
        if (href?.startsWith("#chat-msg-")) {
          const msgIdx = parseInt(href.replace("#chat-msg-", ""));
          return (
            <Tooltip title={title ? `"${title}"` : ""} arrow placement="top">
              <span
                className="inline-ref inline-ref-chat"
                role="link"
                tabIndex={0}
                onClick={() => {
                  setLeftTab(1);
                  setChatHighlight({
                    index: msgIdx,
                    text: title ? normalizeQuoteText(title) : undefined,
                  });
                }}
              >
                {children}
              </span>
            </Tooltip>
          );
        }
        return <a href={href}>{children}</a>;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const caseStudyComponents = useMemo(
    () => ({
      ...markdownComponents,
      h2: ({ children }: { children?: ReactNode }) => {
        const id = "cs-" + String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return <h2 id={id}>{children}</h2>;
      },
      h3: ({ children }: { children?: ReactNode }) => {
        const id = "cs-" + String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return <h3 id={id}>{children}</h3>;
      },
    }),
    [markdownComponents],
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

  const insertQuote = useCallback(
    (markdown: string) => {
      setEditorMarkdown((prev) => {
        const pad = prev.length > 0 && !prev.endsWith("\n\n") ? "\n\n" : "";
        return prev + pad + markdown + "\n\n";
      });
      if (editorMode === "preview") setEditorMode("split");
    },
    [editorMode],
  );

  const handleCaseStudyMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setCaseStudyQuote(null); return; }
    const text = sel.toString().trim();
    if (!text) { setCaseStudyQuote(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setChatQuote(null);
    setCaseStudyQuote({ text, ...getQuotePosition(rect) });
  }, []);

  const handleChatQuote = useCallback(
    (text: string, index: number) => {
      const escaped = escapeMarkdownTitle(text);
      const md = `[Chat #${index + 1}](#chat-msg-${index} "${escaped}")`;
      insertQuote(md);
    },
    [insertQuote],
  );

  const handleChatMouseSelection = useCallback((text: string, index: number, rect: DOMRect) => {
    setCaseStudyQuote(null);
    setChatQuote({ text, index, ...getQuotePosition(rect) });
  }, []);

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
        <div className="page-shell">
          <section className="landing-shell">
            <div className="landing-topbar">
              <Typography variant="body2" className="landing-brand">
                design_it
              </Typography>
              <nav className="landing-nav" aria-label="Landing page navigation">
                <button type="button" onClick={scrollToIntro}>Why</button>
                <button type="button" onClick={scrollToDemo}>Demo</button>
              </nav>
            </div>

            <div className="landing-hero">
              <div className="landing-hero-copy">
                <span className="landing-eyebrow">System design practice for the AI era</span>
                <h1>Turn real-world problems into clear, testable system designs.</h1>
                <p>
                  design_it is a practice and assessment platform for the work software
                  engineers increasingly do: discovering requirements, reasoning about
                  architecture, and communicating a plan that can be implemented by people
                  or AI agents.
                </p>
                <div className="landing-hero-actions">
                  <Button size="large" variant="contained" color="primary" onClick={scrollToDemo}>
                    Enter Demo
                  </Button>
                  <Button size="large" variant="outlined" color="inherit" onClick={scrollToIntro}>
                    Read the Thesis
                  </Button>
                </div>
              </div>
              <div className="landing-proof-panel" aria-label="design_it workflow preview">
                <div>
                  <LandingIcon name="brief" />
                  <span>01</span>
                  <strong>Read the context</strong>
                  <p>Start from a messy, human case brief instead of a toy prompt.</p>
                </div>
                <div>
                  <LandingIcon name="chat" />
                  <span>02</span>
                  <strong>Interview the stakeholder</strong>
                  <p>Ask questions, uncover constraints, and gather real requirements.</p>
                </div>
                <div>
                  <LandingIcon name="soap" />
                  <span>03</span>
                  <strong>Write the design</strong>
                  <p>Use evidence-backed SOAP notes to turn observations into action.</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="landing-next-arrow"
              aria-label="Go to next section"
              onClick={scrollToIntro}
            >
              ↓
            </button>
          </section>

          <section ref={introSectionRef} className="landing-story-section">
            <div className="landing-section-inner landing-story-grid">
              <div>
                <span className="landing-section-kicker">Why design_it exists</span>
                <h2>The bottleneck is moving from implementation to design.</h2>
              </div>
              <div className="landing-story-copy">
                <p>
                  AI coding agents can now build working frontends from a few good prompts.
                  That changes the job of software engineers. The scarce skill is no longer
                  only writing code; it is understanding the problem, choosing the right
                  architecture, and communicating the tradeoffs clearly.
                </p>
                <p>
                  Most interviews still over-index on programming puzzles. design_it shifts
                  practice toward the work engineers actually do: discover functional and
                  non-functional requirements, speak with stakeholders, and translate messy
                  context into a system that can be built.
                </p>
                <div className="landing-shift-diagram" aria-label="Shift from old interviews to design_it">
                  <div>
                    <LandingIcon name="interview" />
                    <span>Old signal</span>
                    <strong>Programming puzzles</strong>
                    <p>Good for screening computational thinking, but often disconnected from daily engineering work.</p>
                  </div>
                  <div className="landing-diagram-arrow" aria-hidden="true">to</div>
                  <div>
                    <LandingIcon name="architecture" />
                    <span>New signal</span>
                    <strong>System reasoning</strong>
                    <p>Tests requirements discovery, architecture judgment, stakeholder communication, and clarity.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="landing-method-section">
            <div className="landing-section-inner">
              <div className="landing-section-heading">
                <span className="landing-section-kicker">How it works</span>
                <h2>A system design interview that can happen asynchronously.</h2>
                <p>
                  Each case gives candidates a realistic context, a stakeholder chat, and a
                  structured response space. The output is not just a diagram. It is a
                  reasoned design narrative.
                </p>
              </div>
              <div className="landing-method-grid">
                <article>
                  <LandingIcon name="brief" />
                  <span>Context</span>
                  <h3>Start with the case</h3>
                  <p>Understand the organization, the pain points, and the constraints.</p>
                </article>
                <article>
                  <LandingIcon name="chat" />
                  <span>Conversation</span>
                  <h3>Ask better questions</h3>
                  <p>Use the chatbot stakeholder to discover what the brief does not say.</p>
                </article>
                <article>
                  <LandingIcon name="soap" />
                  <span>SOAP</span>
                  <h3>Make reasoning visible</h3>
                  <p>Turn subjective notes, objective facts, assessment, and plan into evidence.</p>
                </article>
                <article>
                  <LandingIcon name="architecture" />
                  <span>Architecture</span>
                  <h3>Design the system</h3>
                  <p>Map components, simulate flows, and communicate implementation tradeoffs.</p>
                </article>
              </div>
            </div>
          </section>

          <section className="landing-wins-section">
            <div className="landing-section-inner">
              <div className="landing-section-heading">
                <span className="landing-section-kicker">Who wins</span>
                <h2>A shared marketplace for practice, hiring, and social impact.</h2>
              </div>
              <div className="landing-wins-panels" aria-label="How design_it benefits developers, companies, and NGOs">
                <article className="landing-win-panel">
                  <div className="landing-win-panel-head">
                    <LandingIcon name="architecture" />
                    <span>Developers</span>
                  </div>
                  <h3>Build system design judgment</h3>
                  <div className="landing-win-panel-flow">
                    <small>Real cases</small>
                    <i aria-hidden="true" />
                    <small>Stakeholder chat</small>
                    <i aria-hidden="true" />
                    <small>Portfolio evidence</small>
                  </div>
                </article>
                <article className="landing-win-panel">
                  <div className="landing-win-panel-head">
                    <LandingIcon name="challenge" />
                    <span>Companies</span>
                  </div>
                  <h3>Assess work-like engineering skills</h3>
                  <div className="landing-win-panel-flow">
                    <small>Hosted problems</small>
                    <i aria-hidden="true" />
                    <small>Async evaluation</small>
                    <i aria-hidden="true" />
                    <small>Talent signal</small>
                  </div>
                </article>
                <article className="landing-win-panel">
                  <div className="landing-win-panel-head">
                    <LandingIcon name="community" />
                    <span>NGOs and social teams</span>
                  </div>
                  <h3>Turn ideas into technical plans</h3>
                  <div className="landing-win-panel-flow">
                    <small>Problem briefs</small>
                    <i aria-hidden="true" />
                    <small>Crowdsourced designs</small>
                    <i aria-hidden="true" />
                    <small>Execution pathway</small>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section className="landing-gtm-section">
            <div className="landing-section-inner">
              <div className="landing-section-heading">
                <span className="landing-section-kicker">Go to market</span>
                <h2>Build supply, prove demand, then monetize the network.</h2>
              </div>
              <div className="landing-gtm-roadmap" aria-label="Go to market roadmap">
                <article>
                  <LandingIcon name="community" />
                  <span>Stage 1</span>
                  <h3>Source real problem statements</h3>
                  <p>Work with NGOs and mission-driven organizations to create the baseline case library.</p>
                </article>
                <article>
                  <LandingIcon name="architecture" />
                  <span>Stage 2</span>
                  <h3>Seed practice with universities</h3>
                  <p>Share cases with students who need realistic system design practice for interviews.</p>
                </article>
                <article>
                  <LandingIcon name="interview" />
                  <span>Stage 3</span>
                  <h3>Offer NGO challenge services</h3>
                  <p>Help organizations post problems, review solutions, and give structured feedback.</p>
                </article>
                <article>
                  <LandingIcon name="premium" />
                  <span>Stage 4</span>
                  <h3>Roll out premium and hiring tools</h3>
                  <p>Once the user base grows, offer paid features for users, employers, and recruitment teams.</p>
                </article>
              </div>
            </div>
          </section>

          <section className="landing-impact-section">
            <div className="landing-section-inner landing-impact-grid">
              <div>
                <span className="landing-section-kicker">The bigger dream</span>
                <h2>Kaggle for system design, grounded in social problems.</h2>
                <p>
                  NGOs and social organizations often have important ideas but need help
                  turning them into technical plans. design_it can connect those problems
                  with engineers who need meaningful practice and a portfolio of design work.
                </p>
                <div className="landing-ecosystem-diagram" aria-label="design_it ecosystem">
                  <div className="ecosystem-node ecosystem-center">design_it</div>
                  <div className="ecosystem-node ecosystem-top">
                    <LandingIcon name="community" />
                    NGOs
                  </div>
                  <div className="ecosystem-node ecosystem-left">
                    <LandingIcon name="architecture" />
                    Engineers
                  </div>
                  <div className="ecosystem-node ecosystem-right">
                    <LandingIcon name="challenge" />
                    Companies
                  </div>
                </div>
              </div>
              <div className="landing-impact-list">
                <article>
                  <LandingIcon name="community" />
                  <strong>Free practice cases</strong>
                  <p>The core library stays open so engineers can learn by solving real problems.</p>
                </article>
                <article>
                  <LandingIcon name="premium" />
                  <strong>Premium growth tools</strong>
                  <p>Unlock feedback, benchmarking, deeper cases, and hiring-ready portfolios.</p>
                </article>
                <article>
                  <LandingIcon name="challenge" />
                  <strong>Hosted challenges</strong>
                  <p>Companies and organizations can sponsor problems and surface strong talent.</p>
                </article>
              </div>
            </div>
          </section>

          <section className="landing-carousel-section">
            <div className="landing-carousel-header">
              <span className="landing-section-kicker">Example challenge worlds</span>
              <h2>Design systems for problems that matter.</h2>
            </div>
            <div className="landing-carousel-stage">
              {LANDING_SLIDES.map((slide, index) => {
                const offset = getLandingOffset(index, landingIndex, LANDING_SLIDES.length);
                const isActive = offset === 0;

                return (
                  <article
                    key={`${slide.problem}-${slide.country}`}
                    className={`landing-slide${isActive ? " is-active" : ""}`}
                    aria-label={`${slide.problem} in ${slide.country}`}
                    style={{
                      backgroundImage: `url("${slide.image}")`,
                      backgroundPosition: slide.backgroundPosition ?? "center",
                      ["--landing-intro-color" as string]: slide.introColor,
                      ["--landing-verb-color" as string]: slide.verbColor,
                      ["--landing-problem-color" as string]: slide.problemColor,
                      ["--landing-country-color" as string]: slide.countryColor,
                      transform:
                        offset === 0
                          ? "translateX(-50%) scale(1)"
                          : offset < 0
                            ? "translateX(-108%) scale(0.88)"
                            : "translateX(8%) scale(0.88)",
                      opacity: isActive ? 1 : 0.58,
                      zIndex: isActive ? 3 : 2,
                    }}
                  >
                    <span className="landing-slide-overlay" />
                    <span className="landing-slide-copy">
                      <span className="landing-slide-title">
                        <span className="landing-title-verb">design system</span>
                        <br />
                        <span className="landing-title-base">to solve </span>
                        <span className="landing-title-problem">{slide.problem}</span>
                        <br />
                        <span className="landing-title-base">in </span>
                        <span className="landing-title-country">{slide.country}</span>
                      </span>
                    </span>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="landing-demo-cta-section">
            <div className="landing-demo-cta">
              <div>
                <span className="landing-section-kicker">Try the working prototype</span>
                <h2>Open the demo and solve a case.</h2>
                <p>
                  Use the context, chat, markdown response, and system design canvas to produce
                  a grounded architecture plan.
                </p>
                <Button size="large" variant="contained" color="primary" onClick={scrollToDemo}>
                  Enter Demo
                </Button>
              </div>
              <div className="landing-product-diagram" aria-label="Prototype feature map">
                <div><LandingIcon name="brief" /><span>Context</span></div>
                <div><LandingIcon name="chat" /><span>Stakeholder chat</span></div>
                <div><LandingIcon name="soap" /><span>SOAP response</span></div>
                <div><LandingIcon name="architecture" /><span>System canvas</span></div>
              </div>
            </div>
          </section>

          <section ref={demoSectionRef} id="demo" className="demo-section">
        <main className="app-shell">
          {caseStudyQuote && (
            <Box
              sx={{
                position: "fixed",
                top: caseStudyQuote.top,
                left: caseStudyQuote.left,
                transform: "translateX(-50%)",
                zIndex: 9999,
              }}
            >
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  const { text } = caseStudyQuote;
                  const escaped = escapeMarkdownTitle(text);
                  const md = `[Context](#cs "${escaped}")`;
                  insertQuote(md);
                  setCaseStudyQuote(null);
                  window.getSelection()?.removeAllRanges();
                }}
              >
                ❝ Quote
              </Button>
            </Box>
          )}
          {chatQuote && (
            <Box
              sx={{
                position: "fixed",
                top: chatQuote.top,
                left: chatQuote.left,
                transform: "translateX(-50%)",
                zIndex: 9999,
              }}
            >
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  const escaped = escapeMarkdownTitle(chatQuote.text);
                  const md = `[Chat #${chatQuote.index + 1}](#chat-msg-${chatQuote.index} "${escaped}")`;
                  insertQuote(md);
                  setChatQuote(null);
                  window.getSelection()?.removeAllRanges();
                }}
              >
                Quote
              </Button>
            </Box>
          )}
          <header className="app-topbar">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Design_IT</Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              color="primary"
              value={viewMode}
              onChange={(_e, v) => { if (v) setViewMode(v); }}
            >
              <ToggleButton value="client">User View</ToggleButton>
              <ToggleButton value="admin">Admin View</ToggleButton>
            </ToggleButtonGroup>
          </header>

          {viewMode === "client" ? (
            <section
              ref={clientGridRef}
              className="workspace-grid"
              style={{ ["--panel-columns" as string]: panelGridTemplate(clientPanelWidths) }}
            >
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
                  <div
                    ref={caseStudyRef}
                    className="panel-body markdown-body scrollable"
                    onMouseUp={handleCaseStudyMouseUp}
                  >
                    <ReactMarkdown components={caseStudyComponents}>
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
                          index={index}
                          onQuote={handleChatQuote}
                          onSelectionQuote={handleChatMouseSelection}
                          onDismissSelectionQuote={() => setChatQuote(null)}
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

              <div
                className="panel-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize left and middle panels"
                onMouseDown={handleResizeStart("client", 0)}
              />

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

              <div
                className="panel-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize middle and right panels"
                onMouseDown={handleResizeStart("client", 1)}
              />

              {/* ── right: system design ── */}
              <Paper className="panel" elevation={0}>
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <ReactFlowProvider>
                    <DesignCanvasInner
                      title="System Design"
                      simStartNodeId={simStartNodeId}
                      setSimStartNodeId={setSimStartNodeId}
                    />
                  </ReactFlowProvider>
                </div>
              </Paper>
            </section>
          ) : (
            <section
              ref={adminGridRef}
              className="admin-grid"
              style={{ ["--panel-columns" as string]: panelGridTemplate(adminPanelWidths) }}
            >
              {/* ── left: context / chat history ── */}
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
                </header>
                <Divider />
                {leftTab === 0 && (
                  <div
                    ref={caseStudyRef}
                    className="panel-body markdown-body scrollable"
                  >
                    <ReactMarkdown components={caseStudyComponents}>
                      {renderedSourceMarkdown}
                    </ReactMarkdown>
                  </div>
                )}
                {leftTab === 1 && (
                  <div className="panel-body admin-panel-body">
                    <div className="chat-log scrollable admin-chat-log" aria-live="polite">
                      {messages.map((message, index) => (
                        <ChatBubble
                          key={`${message.role}-${index}`}
                          role={message.role}
                          content={message.content}
                          showLoading={false}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Paper>

              <div
                className="panel-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize left and middle panels"
                onMouseDown={handleResizeStart("admin", 0)}
              />

              {/* ── center: rendered markdown ── */}
              <Paper className="panel" elevation={0}>
                <header className="panel-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Rendered Markdown</Typography>
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

              <div
                className="panel-resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize middle and right panels"
                onMouseDown={handleResizeStart("admin", 1)}
              />

              {/* ── right: system design (read-only) ── */}
              <Paper className="panel" elevation={0}>
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <ReactFlowProvider>
                    <DesignCanvasInner
                      readOnly
                      showSim
                      title="System Design"
                      simStartNodeId={simStartNodeId}
                      setSimStartNodeId={setSimStartNodeId}
                    />
                  </ReactFlowProvider>
                </div>
              </Paper>
            </section>
          )}
        </main>
          </section>
        </div>
      </DesignStateProvider>
    </ThemeProvider>
  );
}

export default App;

