import { useEffect, useRef } from "react";
import Dialog from "./Dialog";
import { SPEC, clearanceField } from "./spec";
import { DIMENSION_SECTIONS, DIMENSIONS_DOC_URL, sourcesUrl } from "./dimensionTables";

const headingId = (section: string) => `dimensions-${section}`;

// The dimensions the parts are made at (dimensionTables.ts) in a modal dialog: a
// table per family of parts, each with a link to its sources on GitHub. Opened at
// a section (#dimensions/pin), it starts there.
export default function Dimensions({
  open,
  section,
  onClose,
}: {
  open: boolean;
  section: string | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);

  // Runs after Dialog's own effect (a child's run first), so the dialog is open and laid out.
  useEffect(() => {
    const dialog = ref.current?.closest("dialog");
    if (!open || !dialog) return;
    const heading = section ? document.getElementById(headingId(section)) : null;
    const bar = dialog.querySelector(".dialog-bar"); // sticky, so it would cover the heading
    dialog.scrollTop = heading ? heading.offsetTop - (bar?.clientHeight ?? 0) - 12 : 0;
  }, [open, section]);

  return (
    <Dialog open={open} onClose={onClose} title="Dimensions" className="dimensions-dialog">
      <article ref={ref} className="dimensions">
        <p>
          The sizes the parts are made at with every fit setting at zero, in mm. Holes and studs are {SPEC.pitch} mm
          apart, and most sizes are simple fractions of that. A fit setting changes the diameters and outside sizes
          listed with it, never the spacing of holes and studs or the length of an axle or pin. Calibration parts are
          made at these sizes too.
        </p>
        <p>
          Where each value comes from, and what was chosen where sources disagree:{" "}
          <a href={DIMENSIONS_DOC_URL} target="_blank" rel="noreferrer">
            Dimensions and sources
          </a>{" "}
          on GitHub.
        </p>
        {DIMENSION_SECTIONS.map((s) => (
          <section key={s.id} aria-labelledby={headingId(s.id)}>
            <div className="dimensions-head">
              <h3 id={headingId(s.id)}>{s.title}</h3>
              <a href={sourcesUrl(s)} target="_blank" rel="noreferrer">
                Sources<span className="visually-hidden"> for {s.title}</span>
              </a>
            </div>
            <table>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Size (mm)</th>
                  <th scope="col">Changed by</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.feature}>
                    <th scope="row">
                      {r.feature}
                      {r.note && <span className="dimension-note">{r.note}</span>}
                    </th>
                    <td>{r.size}</td>
                    <td>
                      {r.setting ? (
                        clearanceField(r.setting).name
                      ) : (
                        <>
                          <span aria-hidden="true">—</span>
                          <span className="visually-hidden">no fit setting</span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </article>
    </Dialog>
  );
}
