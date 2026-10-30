import { useState } from "react";
import { BANO_CHECKLIST, BANO_THEME_LABEL, BANO_THEMES } from "../../../../assessment/bano";
import type { BanoItemResult, BanoReport, BanoStatus, BanoTheme } from "../../../../assessment/bano";
import type { Level, SessionMode } from "../../../../assessment/types";
import { FeedbackButtons } from "../FeedbackButtons";
import { MethodPill } from "../MethodPill";

type BanoPanelProps = {
  report: BanoReport;
  caseId: string;
  mode: SessionMode;
  /** Admin view: the theme counts, the judge's runs, and the weak items without asking. */
  showNumbers: boolean;
  /** Opens every theme group; used by the admin view and the render tests. */
  defaultOpen?: boolean;
  /** Flashes a chat message in the work on the left. */
  onChat?: (index: number) => void;
  /** Jumps to the level a `see_ask` item defers to. */
  onLevel?: (level: Level) => void;
};

const STATUS_ICON: Record<BanoStatus, string> = {
  observed: "⚠",
  not_observed: "✓",
  uncertain: "?",
  see_ask: "→",
  not_applicable: "–",
  info: "•",
};

/** The statuses that are neither a mistake nor a clean pass, so they stay out of a theme's fraction. */
const NOT_COUNTED: readonly BanoStatus[] = ["see_ask", "not_applicable", "info"];

const tipFor = (id: string) => BANO_CHECKLIST.find((item) => item.id === id)?.tip;
const mistakeOf = (id: string) => BANO_CHECKLIST.find((item) => item.id === id)?.mistake ?? id;

function MessageLinks({ item, onChat }: { item: BanoItemResult; onChat?: (index: number) => void }) {
  const indexes = [...new Set(item.evidence.map((entry) => entry.messageIndex))];
  if (indexes.length === 0) return null;
  return (
    <span className="bano-links">
      {indexes.map((index) =>
        onChat ? (
          <button key={index} type="button" className="slack-permalink link-button" onClick={() => onChat(index)}>
            #{index}
          </button>
        ) : (
          <span key={index} className="slack-permalink">
            #{index}
          </span>
        ),
      )}
    </span>
  );
}

function BanoRow({ item, caseId, mode, showNumbers, onChat, onLevel }: { item: BanoItemResult } & Omit<BanoPanelProps, "report" | "defaultOpen">) {
  const tip = item.status === "observed" && mode === "practice" ? tipFor(item.id) : undefined;
  return (
    <li className={`bano-row ${item.status}`}>
      <span className="check-icon" aria-label={item.status.replace(/_/g, " ")}>
        {STATUS_ICON[item.status]}
      </span>
      <span className="bano-mistake">
        {mistakeOf(item.id)}
        {item.count !== undefined && item.count > 1 && <span className="bano-count"> ({item.count})</span>}
        {item.weak && <span className="bano-weak"> harder to read from text</span>}
      </span>
      {item.note && <span className="bano-note">{item.note}</span>}
      {item.status === "see_ask" &&
        (onLevel ? (
          <button type="button" className="link-button" onClick={() => onLevel("ask")}>
            see the Ask check
          </button>
        ) : (
          <span className="bano-note">see the Ask check</span>
        ))}
      <MessageLinks item={item} onChat={onChat} />
      {showNumbers && item.runs && <span className="bano-runs">Runs: {item.runs.join(", ")}</span>}
      <MethodPill method={item.method} />
      {!NOT_COUNTED.includes(item.status) && <FeedbackButtons caseId={caseId} item={`bano:${item.id}`} />}
      {/* Last, because it takes the full width of the row: anything after it would wrap below. */}
      {tip && <span className="bano-tip">{tip}</span>}
    </li>
  );
}

function BanoGroup({
  theme,
  items,
  observed,
  checked,
  defaultOpen,
  ...rowProps
}: { theme: BanoTheme; items: BanoItemResult[]; observed: number; checked: number; defaultOpen?: boolean } & Omit<
  BanoPanelProps,
  "report" | "defaultOpen"
>) {
  // A theme with a mistake in it starts open, the way a failed level does.
  const [open, setOpen] = useState(defaultOpen || observed > 0);
  const uncertain = items.filter((item) => item.status === "uncertain").length;
  const strong = items.filter((item) => !item.weak);
  const weak = items.filter((item) => item.weak);
  const [showWeak, setShowWeak] = useState(rowProps.showNumbers);

  return (
    <section className={`bano-group ${observed > 0 ? "has-observed" : ""}`}>
      <button type="button" className="bano-group-header" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <strong>{BANO_THEME_LABEL[theme]}</strong>
        <span className="bano-group-count">
          {observed > 0 ? "⚠" : "✓"} {observed} of {checked}
        </span>
        {uncertain > 0 && <span className="bano-group-uncertain">{uncertain} couldn't be checked</span>}
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          <ul className="bano-rows">
            {strong.map((item) => (
              <BanoRow key={item.id} item={item} {...rowProps} />
            ))}
          </ul>
          {weak.length > 0 && (
            <div className="bano-weak-group">
              {!rowProps.showNumbers && (
                <button type="button" className="link-button" onClick={() => setShowWeak((value) => !value)} aria-expanded={showWeak}>
                  {showWeak ? "Show less" : `Show more (${weak.length} items that are harder to read from text)`}
                </button>
              )}
              {showWeak && (
                <ul className="bano-rows">
                  {weak.map((item) => (
                    <BanoRow key={item.id} item={item} {...rowProps} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/**
 * The interview-mistake check, read like a linter report: one group per theme, one row per mistake,
 * and the messages where it happened. Nothing here is scored, and the counts are never added up.
 */
export function BanoPanel({ report, defaultOpen, ...rowProps }: BanoPanelProps) {
  const notApplicable = report.items.filter((item) => item.status === "not_applicable");

  return (
    <section className="bano-panel" id="bano-panel" aria-label="Interview mistake check">
      <p className="bano-about">
        These are the mistakes novices most often make in requirements interviews, from a published checklist of 33 in
        seven themes. This is teaching only, not scored: nothing here is part of a level and nothing here is added into a score.
        {rowProps.showNumbers && (
          <span className="bano-provenance">
            {" "}
            Checklist {report.checklistVersion}, config {report.configHash}
            {report.promptVersion ? `, judge prompt ${report.promptVersion}` : ", no judge run"}.
          </span>
        )}
      </p>

      {BANO_THEMES.map((theme) => {
        const items = report.items.filter((item) => item.theme === theme && item.status !== "not_applicable");
        const count = report.themes.find((entry) => entry.theme === theme);
        if (items.length === 0) return null;
        return (
          <BanoGroup
            key={theme}
            theme={theme}
            items={items}
            observed={count?.observed ?? 0}
            checked={count?.checked ?? 0}
            {...(defaultOpen === undefined ? {} : { defaultOpen })}
            {...rowProps}
          />
        );
      })}

      {notApplicable.length > 0 && (
        <p className="bano-not-checked">
          Not checked in a text chat: {notApplicable.map((item) => BANO_CHECKLIST.find((spec) => spec.id === item.id)?.notApplicable).join(", ")}.
        </p>
      )}

      <p className="bano-citation">
        About this check: the checklist comes from Bano, M., Zowghi, D., Ferrari, A., Spoletini, P. and Donati, B.
        (2019), “Teaching requirements elicitation interviews: an empirical study of learning from mistakes”,
        Requirements Engineering journal. The wording here is ours, not the paper's.
      </p>
    </section>
  );
}
