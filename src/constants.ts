import { MarkerType } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import type { LandingSlide, PanelWidths } from "./types";

export const defaultSystemPrompt = `You are Sarah, a program director at BrightPath, an NGO that supports vulnerable children in urban communities. You are not a developer - you are a non-technical manager who needs a system built.

Your field workers currently use WhatsApp to report incidents involving at-risk children. Messages get lost, case managers miss alerts, and there is no way to track whether an alert was acknowledged or acted upon.

You want a digital system where field workers can log an incident, and the system automatically notifies the right case managers and supervisors based on the child's assigned case. You want to know that alerts are received, and you want a record of every incident and response.

A developer will ask you questions to clarify requirements and design the system. Respond like a real non-technical client: explain your problems in plain language, answer questions based on your experience, and help the developer understand what matters most to your team.`;

export const LANDING_SLIDES: LandingSlide[] = [
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

export const PALETTE_ITEMS = [
  { nodeType: "client", label: "Client" },
  { nodeType: "server", label: "Server" },
  { nodeType: "database", label: "Database" },
  { nodeType: "cache", label: "Cache" },
  { nodeType: "loadBalancer", label: "Load Balancer" },
  { nodeType: "queue", label: "Queue" },
  { nodeType: "cdn", label: "CDN" },
  { nodeType: "apiGateway", label: "API Gateway" },
];

export const NODE_COLORS: Record<string, string> = {
  client: "#86efac",
  server: "#93c5fd",
  database: "#d8b4fe",
  cache: "#fdba74",
  loadBalancer: "#fca5a5",
  queue: "#6ee7b7",
  cdn: "#bef264",
  apiGateway: "#f9a8d4",
};

export const INITIAL_NODES: Node[] = [
  { id: "client-1", type: "custom", position: { x: 160, y: 40 }, data: { label: "Field Worker App", color: NODE_COLORS.client, nodeType: "client" } },
  { id: "apiGateway-1", type: "custom", position: { x: 160, y: 160 }, data: { label: "API Gateway", color: NODE_COLORS.apiGateway, nodeType: "apiGateway" } },
  { id: "server-1", type: "custom", position: { x: 80, y: 280 }, data: { label: "Incident Server", color: NODE_COLORS.server, nodeType: "server" } },
  { id: "database-1", type: "custom", position: { x: 320, y: 280 }, data: { label: "Incident DB", color: NODE_COLORS.database, nodeType: "database" } },
  { id: "queue-1", type: "custom", position: { x: 80, y: 400 }, data: { label: "Alert Queue", color: NODE_COLORS.queue, nodeType: "queue" } },
  { id: "server-2", type: "custom", position: { x: 80, y: 520 }, data: { label: "Notification Server", color: NODE_COLORS.server, nodeType: "server" } },
];

const ARROW = { type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } };

export const INITIAL_EDGES: Edge[] = [
  { id: "e1", source: "client-1", target: "apiGateway-1", ...ARROW },
  { id: "e2", source: "apiGateway-1", target: "server-1", ...ARROW },
  { id: "e3", source: "server-1", target: "database-1", ...ARROW },
  { id: "e4", source: "server-1", target: "queue-1", ...ARROW },
  { id: "e5", source: "queue-1", target: "server-2", ...ARROW },
  { id: "e6", source: "server-2", target: "database-1", ...ARROW },
];

export const COMPONENT_LATENCY: Record<string, number> = {
  client: 0,
  cdn: 3,
  apiGateway: 5,
  loadBalancer: 2,
  server: 30,
  cache: 2,
  database: 15,
  queue: 8,
};

export const PANEL_HANDLE_WIDTH = 14;
export const MIN_PANEL_WIDTH = 280;
export const DEFAULT_PANEL_WIDTHS: PanelWidths = [1, 1, 1];
