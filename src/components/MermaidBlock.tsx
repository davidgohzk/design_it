import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

export function MermaidBlock({ chart }: { chart: string }) {
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
        if (!disposed) {
          setError(err instanceof Error ? err.message : "Could not render chart.");
        }
      }
    };
    void run();
    return () => {
      disposed = true;
    };
  }, [chart]);

  if (error) return <code>{`Mermaid error: ${error}`}</code>;

  return (
    <div className="mermaid-wrap">
      <div ref={containerRef} className="mermaid-diagram" />
    </div>
  );
}
