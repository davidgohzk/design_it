import { createTheme } from "@mui/material";

export type ThemeMode = "light" | "dark";

const TYPOGRAPHY = {
  fontSize: 14,
  fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
  h6: { fontSize: "1.06rem", lineHeight: 1.22, fontWeight: 700 },
  subtitle1: { fontSize: "0.98rem", lineHeight: 1.28, fontWeight: 700 },
  body1: { fontSize: "0.92rem", lineHeight: 1.58 },
  body2: { fontSize: "0.88rem", lineHeight: 1.52 },
  caption: { fontSize: "0.74rem", lineHeight: 1.4 },
  button: { textTransform: "none" as const, fontWeight: 600 },
};

const PALETTE = {
  light: {
    mode: "light" as const,
    primary: { main: "#006f9a" },
    secondary: { main: "#8f4889" },
    success: { main: "#1a7f37" },
    background: { default: "#e6eef3", paper: "#f7fbff" },
  },
  dark: {
    mode: "dark" as const,
    primary: { main: "#58a6ff" },
    secondary: { main: "#d2a8ff" },
    success: { main: "#3fb950" },
    background: { default: "#0d1117", paper: "#161b22" },
    text: { primary: "#e6edf3", secondary: "#9198a1" },
  },
};

export const appThemes = {
  light: createTheme({ palette: PALETTE.light, shape: { borderRadius: 12 }, typography: TYPOGRAPHY }),
  dark: createTheme({ palette: PALETTE.dark, shape: { borderRadius: 12 }, typography: TYPOGRAPHY }),
};

/** Kept for older imports; the light theme. */
export const appTheme = appThemes.light;

const STORAGE_KEY = "design_it.theme";

/** The theme the engineer last chose, else what their system asks for. */
export function preferredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be blocked; fall back to the system setting.
  }
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function saveTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be blocked; the choice still holds for this session.
  }
}
