import type { ReactNode } from "react";
import { SvgIcon } from "@mui/material";

export type LandingIconName =
  | "brief"
  | "chat"
  | "soap"
  | "architecture"
  | "agent"
  | "interview"
  | "community"
  | "premium"
  | "challenge";

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
