import { useState, type CSSProperties } from "react";
import { SECTIONS } from "../destinations";
import { FEEDBACK_AREAS, INITIAL_AREA, headline, type FeedbackArea, type FeedbackAreaId } from "../feedbackAreas";
import { FEEDBACK } from "../landing.content";
import { Eyebrow, Sticker, type StickerName } from "../parts";
import {
  BOXES,
  COLUMN_LABELS,
  FACTS,
  INITIAL_SELECTION,
  REQUIREMENTS,
  boxesOf,
  chainOf,
  factStatus,
  requirementOf,
  summarize,
  traceGeometry,
  type Fact,
  type Requirement,
  type Selection,
} from "../traceMap";
import "./feedback.css";

const GEOMETRY = traceGeometry();
const SUMMARY = summarize();

// Each card is one solid colour. The CSS gives every fill an ink (white or black) that passes AA on it.
const LOOK: Record<FeedbackAreaId, { icon: StickerName; fill: "blue" | "yellow" | "purple" | "green" }> = {
  interview: { icon: "chat", fill: "blue" },
  traceability: { icon: "chain", fill: "yellow" },
  decisions: { icon: "scale", fill: "purple" },
  quality: { icon: "gauge", fill: "green" },
};

export function FeedbackSection() {
  const [selected, setSelected] = useState<FeedbackAreaId>(INITIAL_AREA);
  const area = FEEDBACK_AREAS.find((a) => a.id === selected)!;
  return (
    <section className="lp-section lp-feedback" id={SECTIONS.feedback} tabIndex={-1} aria-labelledby="feedback-title">
      <div className="lp-container lp-split lp-feedback-split">
        <header className="lp-intro">
          <Eyebrow icon="flag">Example feedback</Eyebrow>
          <h2 id="feedback-title">{FEEDBACK.title}</h2>
          <p className="lp-body">{FEEDBACK.lead}</p>
        </header>

        <div className="lp-feedback-board">
          <ul className="lp-areas">
            {FEEDBACK_AREAS.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={`lp-area lp-area--${LOOK[a.id].fill}`}
                  aria-pressed={a.id === selected}
                  aria-controls="feedback-detail"
                  onClick={() => setSelected(a.id)}
                >
                  <span className="lp-area-head">
                    <Sticker name={LOOK[a.id].icon} />
                    {a.title}
                  </span>
                  <span className="lp-area-num">{headline(a)}</span>
                  <MiniDiagram area={a} />
                </button>
              </li>
            ))}
          </ul>

          <div id="feedback-detail" className="lp-area-detail" role="region" aria-label={`${area.title} feedback`} aria-live="polite">
            <AreaDetail area={area} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A card's glance picture, drawn in the card's ink. A hollow or crossed mark is what was missed or failed, always beside a text label. */
function MiniDiagram({ area }: { area: FeedbackArea }) {
  switch (area.id) {
    case "interview":
      return (
        <span className="lp-mini">
          <span className="lp-mini-bar" aria-hidden="true">
            {area.facts.map((f) => (
              <span key={f.label} className={f.found ? "is-ok" : "is-bad"} />
            ))}
          </span>
          <span className="lp-mini-note">{area.facts.filter((f) => !f.found).length} missed</span>
        </span>
      );
    case "traceability":
      return (
        <span className="lp-mini">
          <svg className="lp-mini-chain" viewBox="0 0 120 24" aria-hidden="true" focusable="false">
            <path d="M19 12H53" />
            <path className="is-bad" d="M67 12H101" />
            <circle cx="12" cy="12" r="7" />
            <circle cx="60" cy="12" r="7" />
            <circle className="is-bad" cx="108" cy="12" r="7" />
            <text x="84" y="16">
              ✕
            </text>
          </svg>
          <span className="lp-mini-note">{FACTS.filter((f) => factStatus(f) === "dropped").map((f) => f.label).join(", ")}</span>
        </span>
      );
    case "decisions":
      return (
        <span className="lp-mini">
          <span className="lp-mini-marks" aria-hidden="true">
            {area.scenarios.map((s) => (
              <span key={s.label} className={s.holds ? "is-ok" : "is-bad"}>
                {s.holds ? "✓" : "✕"}
              </span>
            ))}
          </span>
          <span className="lp-mini-note">{area.scenarios.filter((s) => !s.holds).map((s) => s.label).join(", ")}</span>
        </span>
      );
    case "quality":
      return (
        <span className="lp-mini">
          <span className="lp-mini-rings" aria-hidden="true">
            {area.notes.map((n) => (
              <Ring key={n.quality} level={n.level} letter={n.quality[0]} />
            ))}
          </span>
          <span className="lp-mini-note">{area.notes.filter((n) => n.level === 1).map((n) => `${n.quality} to watch`).join(", ")}</span>
        </span>
      );
  }
}

/** A gauge filled to `level` thirds; level 1 is the one to watch. */
function Ring({ level, letter }: { level: 1 | 2 | 3; letter: string }) {
  return (
    <svg
      className={`lp-ring${level === 1 ? " is-bad" : ""}`}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
      style={{ "--level": level / 3 } as CSSProperties}
    >
      <circle className="lp-ring-track" cx="14" cy="14" r="11" pathLength="1" />
      <circle className="lp-ring-fill" cx="14" cy="14" r="11" pathLength="1" />
      <text x="14" y="18">
        {letter}
      </text>
    </svg>
  );
}

function AreaDetail({ area }: { area: FeedbackArea }) {
  switch (area.id) {
    case "interview":
      return (
        <div className="lp-doc lp-area-panel">
          {[true, false].map((found) => {
            const facts = area.facts.filter((f) => f.found === found);
            return (
              <div key={String(found)}>
                <h3 className="lp-trace-label">
                  {found ? "Found" : "Missed"} ({facts.length})
                </h3>
                <ul className={`lp-chips lp-tone--${found ? "green" : "red"}`}>
                  {facts.map((f) => (
                    <li key={f.label}>{f.label}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      );
    case "traceability":
      return <TraceMap />;
    case "decisions":
      return (
        <ul className="lp-doc lp-area-panel lp-area-rows">
          {area.scenarios.map((s) => (
            <li key={s.label} className={s.holds ? "lp-tone--green" : "lp-tone--red"}>
              <span className="lp-area-mark" aria-hidden="true">
                {s.holds ? "✓" : "✕"}
              </span>
              <span>
                <strong>{s.label}</strong>
                <span className="lp-area-verdict">{s.holds ? "Holds" : "Fails"}</span>
                <span className="lp-area-note">{s.note}</span>
              </span>
            </li>
          ))}
        </ul>
      );
    case "quality":
      return (
        <ul className="lp-doc lp-area-panel lp-area-rows">
          {area.notes.map((n) => (
            <li key={n.quality} className={n.level === 1 ? "lp-tone--red" : "lp-tone--green"}>
              <Ring level={n.level} letter={n.quality[0]} />
              <span>
                <strong>{n.quality}</strong>
                {n.level === 1 && <span className="lp-area-verdict">To watch</span>}
                <span className="lp-area-note">{n.note}</span>
              </span>
            </li>
          ))}
        </ul>
      );
  }
}

const boxList = (r: Requirement) => boxesOf(r).map((b) => b.label).join(", ");

function chainText(fact: Fact) {
  const r = requirementOf(fact);
  return r ? `“${fact.label}” → ${r.id} ${r.label} → ${boxList(r)}` : `“${fact.label}” → dropped, no requirement`;
}

function TraceMap() {
  const [selection, setSelection] = useState<Selection>(INITIAL_SELECTION);
  const chain = chainOf(selection);
  const lit = (key: string) => (chain.has(key) ? " is-lit" : " is-dim");
  const select = (next: Selection) => ({
    "aria-pressed": selection.kind === next.kind && selection.id === next.id,
    onClick: () => setSelection(next),
    onFocus: () => setSelection(next),
    onMouseEnter: () => setSelection(next),
  });

  const selectedFact = selection.kind === "fact" ? FACTS.find((f) => f.id === selection.id) : undefined;
  const selectedReq = selection.kind === "requirement" ? REQUIREMENTS.find((r) => r.id === selection.id) : undefined;

  return (
    <>
      <ul className="lp-trace-stats">
        <li className="lp-tone--green">
          {SUMMARY.carried} of {SUMMARY.facts} facts carried through
        </li>
        <li className="lp-tone--red">{SUMMARY.dropped} dropped</li>
      </ul>

      <div className="lp-trace">
        <div className="lp-trace-links" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
            {GEOMETRY.links.map((l) => (
              <path key={`${l.from}-${l.to}`} className={`lp-trace-link${chain.has(l.from) && chain.has(l.to) ? " is-lit" : " is-dim"}`} d={l.d} vectorEffect="non-scaling-stroke" />
            ))}
            {GEOMETRY.stubs.map((s) => (
              <path key={s.from} className={`lp-trace-link lp-trace-link--dropped${lit(s.from)}`} d={s.d} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {GEOMETRY.stubs.map((s) => (
            <span key={s.from} className={`lp-trace-break${lit(s.from)}`} style={{ left: `${s.end.x}%`, top: `${s.end.y}%` }}>
              ✕
            </span>
          ))}
        </div>

        <div className="lp-trace-col">
          <p className="lp-trace-label">{COLUMN_LABELS[0]}</p>
          <ul className="lp-trace-list">
            {FACTS.map((f) => {
              const r = requirementOf(f);
              const dropped = factStatus(f) === "dropped";
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    className={`lp-trace-card ${dropped ? "lp-tone--red is-dropped" : "lp-tone--blue"}${lit(`fact:${f.id}`)}`}
                    {...select({ kind: "fact", id: f.id })}
                  >
                    <span>“{f.label}”</span>
                    {dropped && <span className="lp-trace-tag">Dropped</span>}
                    {r && (
                      <span className="lp-trace-chain" aria-hidden="true">
                        <span>→ {r.id}</span>
                        {boxesOf(r).map((b) => (
                          <span key={b.id}>→ {b.label}</span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="lp-trace-col">
          <p className="lp-trace-label">{COLUMN_LABELS[1]}</p>
          <ul className="lp-trace-list">
            {REQUIREMENTS.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`lp-trace-card lp-tone--green${lit(`req:${r.id}`)}`}
                  {...select({ kind: "requirement", id: r.id })}
                >
                  <span className="lp-trace-id">{r.id}</span>
                  <span>{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-trace-col">
          <p className="lp-trace-label">{COLUMN_LABELS[2]}</p>
          <ul className="lp-trace-list">
            {BOXES.map((b) => (
              <li key={b.id}>
                <div className={`lp-trace-card lp-trace-box lp-tone--gray${lit(`box:${b.id}`)}`}>{b.label}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ul className="lp-sr-only">
        {FACTS.map((f) => (
          <li key={f.id}>{chainText(f)}</li>
        ))}
      </ul>

      <div className="lp-finding-card lp-trace-finding" aria-live="polite">
        {selectedFact && factStatus(selectedFact) === "dropped" ? (
          <>
            <p className="lp-status">{FEEDBACK.findingHeading}</p>
            <blockquote>
              <p>
                <span className="lp-who">Mei</span> {FEEDBACK.quote}
              </p>
            </blockquote>
            <p>{FEEDBACK.finding}</p>
            <h3 className="lp-trace-heading">{FEEDBACK.promptHeading}</h3>
            <p>{FEEDBACK.prompt}</p>
          </>
        ) : (
          <p className="lp-trace-ok">{carriedLine(selectedFact, selectedReq)}</p>
        )}
      </div>
    </>
  );
}

function carriedLine(fact: Fact | undefined, requirement: Requirement | undefined) {
  const r = fact ? requirementOf(fact) : requirement;
  if (!r) return null;
  if (fact) return `Carried through: ${r.id} → ${boxList(r)}`;
  const sources = FACTS.filter((f) => f.requirement === r.id).map((f) => `“${f.label}”`);
  return `${r.id} comes from ${sources.join(" and ")} and is drawn as ${boxList(r)}.`;
}
