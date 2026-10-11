import type { ReactNode } from "react";
import { SvgIcon } from "@mui/material";

type LandingIconName =
  | "brief"
  | "chat"
  | "architecture"
  | "agent"
  | "interview"
  | "check";

export function LandingIcon({ name }: { name: LandingIconName }) {
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
    check: (
      <>
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
        <path d="M8.5 12l2.5 2.5 4.5-5" />
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
