export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type SimLogEntry = {
  text: string;
  kind: "start" | "hop" | "edge" | "done" | "stop" | "stat";
};

export type FloatingQuote = {
  text: string;
  top: number;
  left: number;
};

export type ChatFloatingQuote = FloatingQuote & {
  index: number;
};

export type PanelWidths = [number, number, number];

export type LandingSlide = {
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

export type ResizeState = {
  view: "client" | "admin";
  handleIndex: 0 | 1;
  startX: number;
  startWidths: PanelWidths;
  containerWidth: number;
};
