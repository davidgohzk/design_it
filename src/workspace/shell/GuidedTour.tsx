import { useEffect, useState } from "react";
import { Button, Typography } from "@mui/material";
import { rememberTour } from "./tour";
import type { TourStop } from "./tour";

/** A short guided tour: highlights one part of the page at a time. Warm-up case only. */
export function GuidedTour({ stops, onClose }: { stops: readonly TourStop[]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);
  const stop = stops[step];

  useEffect(() => {
    const target = document.querySelector(stop.selector);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => setBox(target?.getBoundingClientRect() ?? null);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [stop]);

  const finish = () => {
    rememberTour();
    onClose();
  };

  const style = box
    ? { top: Math.min(box.bottom + 10, window.innerHeight - 190), left: Math.max(12, Math.min(box.left, window.innerWidth - 360)) }
    : { top: 120, left: 40 };

  return (
    <div className="tour-layer" role="dialog" aria-label="Guided tour">
      {box && (
        <div className="tour-spotlight" style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }} />
      )}
      <div className="tour-card" style={style}>
        <Typography variant="subtitle1">{stop.title}</Typography>
        <Typography variant="body2">{stop.body}</Typography>
        <div className="tour-actions">
          <Typography variant="caption" color="text.secondary">
            {step + 1} of {stops.length}
          </Typography>
          <Button size="small" onClick={finish}>
            Skip
          </Button>
          <Button size="small" variant="contained" onClick={() => (step === stops.length - 1 ? finish() : setStep(step + 1))}>
            {step === stops.length - 1 ? "Start working" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
