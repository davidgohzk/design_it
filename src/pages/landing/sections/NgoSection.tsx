import { useRef } from "react";
import { SECTIONS } from "../destinations";
import { useTraceOnce } from "../hooks";
import { NGO } from "../landing.content";
import { ContactAction, Icon } from "../parts";

export function NgoSection() {
  return (
    <section className="lp-section lp-ngo" id={SECTIONS.ngo} tabIndex={-1} aria-labelledby="ngo-title">
      <div className="lp-container">
        <div className="lp-ngo-top">
          <div className="lp-intro">
            <p className="lp-eyebrow">{NGO.label}</p>
            <h2 id="ngo-title">{NGO.title}</h2>
            {NGO.body.map((p) => (
              <p key={p} className="lp-body">
                {p}
              </p>
            ))}
          </div>
          <OperationsScene />
        </div>

        <ol className="lp-columns">
          {NGO.steps.map((step, i) => (
            <li key={step.title}>
              <span className="lp-step-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="lp-ngo-cta">
          <ContactAction>{NGO.action}</ContactAction>
          <p className="lp-caption">{NGO.note}</p>
        </div>
      </div>
    </section>
  );
}

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

        <div className="lp-scene-note">
          <Icon name="phone" />
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
      <figcaption className="lp-scene-caption">
        The phone note says Tuesday 7pm, but that slot on the calendar is empty. {NGO.sceneCaption}
      </figcaption>
    </figure>
  );
}
