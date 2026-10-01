import { useEffect, useRef, useState } from "react";
import mermaid from "../lib/mermaid";

export function MermaidBlock({
  chart,
  className,
  naturalSize = false,
  onRender,
}: {
  chart: string;
  className?: string;
  /** Draw at Mermaid's own size instead of stretching to the width; still shrinks to fit a narrower column. */
  naturalSize?: boolean;
  /** Called with the drawn diagram each time it is (re)drawn, e.g. to colour it. */
  onRender?: (svg: SVGSVGElement) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The latest callback, so a new function each render doesn't redraw the diagram.
  const onRenderRef = useRef(onRender);
  useEffect(() => {
    onRenderRef.current = onRender;
  });

  useEffect(() => {
    let disposed = false;
    const run = async () => {
      try {
        setError(null);
        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!disposed && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const element = containerRef.current.querySelector("svg");
          // Mermaid sets width="100%" and max-width to the drawing's real width; use that real width,
          // capped at the column so a wide diagram shrinks rather than scrolling sideways.
          if (naturalSize && element?.style.maxWidth) {
            element.style.width = element.style.maxWidth;
            element.style.maxWidth = "100%";
          }
          if (element) onRenderRef.current?.(element);
        }
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : "Could not render chart.");
        }
      }
    };
    void run();
    return () => {
      disposed = true;
    };
  }, [chart, naturalSize]);

  if (error) return <code>{`Mermaid error: ${error}`}</code>;

  return (
    <div className={className ? `mermaid-wrap ${className}` : "mermaid-wrap"}>
      <div ref={containerRef} className="mermaid-diagram" />
    </div>
  );
}
