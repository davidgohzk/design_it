import { useMemo } from "react";
import { html as diffToHtml } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";

export function DiffBlock({ patch }: { patch: string }) {
  const markup = useMemo(
    () =>
      diffToHtml(patch, {
        outputFormat: "line-by-line",
        drawFileList: false,
        matching: "lines",
      }),
    [patch],
  );

  // diff2html only exposes a string-HTML API; it escapes the diff content it renders.
  return <div className="timeline-diff" dangerouslySetInnerHTML={{ __html: markup }} />;
}
