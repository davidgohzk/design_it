import { useRef } from "react";
import { SECTIONS } from "../destinations";
import { useTraceOnce } from "../hooks";
import { NGO } from "../landing.content";
import { ContactAction, Eyebrow, SectionLink, Sticker, type StickerName } from "../parts";

export function NgoSection() {
  return (
    <section className="lp-section lp-ngo" id={SECTIONS.ngo} tabIndex={-1} aria-labelledby="ngo-title">
      <div className="lp-container">
        <div className="lp-ngo-top">
          <div className="lp-intro">
            <Eyebrow icon="heart">
              {NGO.label}
            </Eyebrow>
            <h2 id="ngo-title">{NGO.title}</h2>
            <p className="lp-body">{NGO.body}</p>
          </div>
          <OperationsScene />
        </div>

        <ol className="lp-ngo-steps">
          {NGO.steps.map((step, i) => (
            <li key={step.title}>
              <span className="lp-ngo-step-mark">
                <Sticker name={STEP_ICONS[i]} />
              </span>
              <span className="lp-ngo-step-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="lp-ngo-cta">
          <div>
            <h3>{NGO.ctaTitle}</h3>
            <p>{NGO.ctaBody}</p>
          </div>
          <div className="lp-ngo-cta-actions">
            <ContactAction className="lp-btn lp-btn--primary">{NGO.action}</ContactAction>
            <SectionLink to={SECTIONS.feedback} className="lp-text-link">
              See example feedback <span aria-hidden="true">→</span>
            </SectionLink>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEP_ICONS: StickerName[] = ["chat", "pencil", "bulb"];
const DAYS = ["Mon", "Tue", "Wed", "Thu"];
// Grid rows are 6pm, 7pm, 8pm. The empty Tue 7pm cell is the slot the phone booking never reached.
const BOOKED: Record<string, string> = { "Mon-0": "Choir", "Mon-2": "Tuition", "Wed-1": "Yoga", "Thu-0": "Seniors’ club" };

function OperationsScene() {
  const ref = useRef<HTMLElement>(null);
  useTraceOnce(ref);
  return (
    <figure className="lp-scene" ref={ref} aria-labelledby="scene-label">
      <p className="lp-preview-label" id="scene-label">
        {NGO.sceneLabel}
      </p>
      <div className="lp-scene-canvas">
        <div className="lp-scene-sheet" aria-label="Hall B spreadsheet fragment">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Name</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mon</td>
                <td>Choir</td>
              </tr>
              <tr>
                <td>Wed</td>
                <td>Yoga</td>
              </tr>
              <tr>
                <td>Tue</td>
                <td className="lp-cell-empty">?</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="lp-scene-calendar" aria-label="Hall B bookings calendar, incomplete">
          <p className="lp-scene-title">Hall B · this week</p>
          <div className="lp-cal">
            {DAYS.map((day) => (
              <div key={day} className="lp-cal-col">
                <span className="lp-cal-day">{day}</span>
                {[0, 1, 2].map((slot) => {
                  const booking = BOOKED[`${day}-${slot}`];
                  const missing = day === "Tue" && slot === 1;
                  return (
                    <span
                      key={slot}
                      className={`lp-cal-slot${booking ? " is-booked" : ""}${missing ? " is-missing" : ""}`}
                    >
                      {booking ?? (missing ? "Not recorded" : "")}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Focusable so keyboard visitors can also trace the note to the slot it never reached. */}
        <div className="lp-scene-note" tabIndex={0} role="group" aria-label="Phone booking sticky note">
          <Sticker name="phone" />
          <p>
            <strong>Phone booking</strong>
            Tue 7pm, Hall B
            <br />
            Mr Tan, 20 people
          </p>
        </div>

        <svg className="lp-scene-trace" viewBox="0 0 600 420" aria-hidden="true">
          <path className="lp-trace-path" d="M360 318 C 300 300, 230 260, 205 200" />
        </svg>
      </div>
      <figcaption className="lp-sr-only">
        The phone note says Tuesday 7pm, but that slot on the calendar is empty.
      </figcaption>
    </figure>
  );
}
