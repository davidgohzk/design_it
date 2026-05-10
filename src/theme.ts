import { createTheme } from "@mui/material";

export const appTheme = createTheme({
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
