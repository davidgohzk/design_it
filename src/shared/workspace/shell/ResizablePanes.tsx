import { Fragment, useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "design_it.paneSizes";
const MIN_FRACTION = 0.15;

function storedSizes(key: string, count: number, fallback: number[]): number[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (Array.isArray(value) && value.length === count && value.every((size) => typeof size === "number")) return value;
  } catch {
    // Storage can be blocked; use the default widths.
  }
  return fallback;
}

/**
 * The three resizable panes, as in VS Code: drag a divider to resize, double-click to reset. Widths
 * are remembered per browser. Keyboard: focus a divider and use ← / →.
 */
export function ResizablePanes({
  children,
  defaultSizes,
  storageKey = "default",
}: {
  children: React.ReactNode[];
  defaultSizes: number[];
  /** Each layout remembers its own widths: the workspace has three panes, the review two. */
  storageKey?: string;
}) {
  const panes = children.filter(Boolean);
  const key = `${STORAGE_PREFIX}.${storageKey}`;
  const [sizes, setSizes] = useState(() => storedSizes(key, defaultSizes.length, defaultSizes));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ index: number; startX: number; startSizes: number[] } | null>(null);

  const save = useCallback((next: number[]) => {
    setSizes(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage can be blocked; the widths still hold for this session.
    }
  }, [key]);

  /** Moves `delta` (a fraction of the width) from the pane right of the divider to the one left of it. */
  const move = useCallback(
    (index: number, delta: number, from: number[]) => {
      const total = from.reduce((sum, size) => sum + size, 0);
      const min = MIN_FRACTION * total;
      const left = from[index] + delta;
      const right = from[index + 1] - delta;
      if (left < min || right < min) return;
      const next = [...from];
      next[index] = left;
      next[index + 1] = right;
      save(next);
    },
    [save],
  );

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const width = containerRef.current?.clientWidth;
      if (!drag || !width) return;
      const total = drag.startSizes.reduce((sum, size) => sum + size, 0);
      move(drag.index, ((event.clientX - drag.startX) / width) * total, drag.startSizes);
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.classList.remove("is-resizing");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [move]);

  // Only the widths of the panes that are showing matter; a single pane fills the row.
  if (panes.length < 2) {
    return (
      <section className="simple-grid single" ref={containerRef}>
        {panes}
      </section>
    );
  }

  return (
    <section
      className="simple-grid"
      ref={containerRef}
      style={{ gridTemplateColumns: sizes.flatMap((size, index) => (index ? ["6px", `minmax(0, ${size}fr)`] : [`minmax(0, ${size}fr)`])).join(" ") }}
    >
      {panes.map((pane, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <div
              className="pane-divider"
              role="separator"
              aria-orientation="vertical"
              aria-label={`Resize pane ${index}`}
              tabIndex={0}
              onPointerDown={(event) => {
                dragRef.current = { index: index - 1, startX: event.clientX, startSizes: sizes };
                document.body.classList.add("is-resizing");
              }}
              onDoubleClick={() => save(defaultSizes)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                move(index - 1, event.key === "ArrowLeft" ? -0.08 : 0.08, sizes);
              }}
            />
          )}
          {pane}
        </Fragment>
      ))}
    </section>
  );
}
