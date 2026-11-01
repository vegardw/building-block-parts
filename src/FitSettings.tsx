// The fit settings: the dialog that edits, saves and loads all of them, the box on
// the Calibrate section with the same file actions, and the box on the Parts
// section that shows the ones the current part uses.
import { useRef, useState, type ReactNode } from "react";
import { saveAs } from "file-saver";

import Dialog from "./Dialog";
import { Field } from "./fields";
import { SPEC, CLEARANCE_FIELDS, type ClearanceKey } from "./spec";
import { formatClearance, readClearance } from "./clearance";
import { fieldStatus, fitFromFile, fitToFile, isoDate, NOMINAL_FIT, type Fit, type FieldStatus } from "./fit";
import { stepFor } from "./calibrationSteps";
import { stepHash } from "./route";
import type { SummaryItem } from "./parts/types";

export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// "+0.10 mm", or "invalid" while the typed text isn't a valid value.
export function valueText(fit: Fit, key: ClearanceKey): string {
  const value = readClearance(fit.text, [key]).clearance?.[key];
  return value === undefined ? "invalid" : `${formatClearance(value)} mm`;
}

export function statusText(status: FieldStatus): string {
  switch (status.kind) {
    case "calibrated":
      return `calibrated ${formatDate(status.date)}`;
    case "hand":
      return status.date ? `set by hand ${formatDate(status.date)}` : "set by hand";
    case "none":
      return "not calibrated";
  }
}

interface Message {
  text: string;
  error: boolean;
  undo?: Fit; // the settings before a load or reset
}

// Save to file, load from file and reset, with the outcome and an Undo. Used in
// the dialog and on the Calibrate section; `children` are extra buttons first.
function FitFileActions({
  fit,
  onReplace,
  children,
}: {
  fit: Fit;
  onReplace: (fit: Fit) => void;
  children?: ReactNode;
}) {
  const [message, setMessage] = useState<Message | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const undo = message?.undo;

  const save = () => {
    const date = isoDate(new Date());
    const file = fitToFile(fit, date);
    if ("error" in file) {
      setMessage({ text: file.error, error: true });
      return;
    }
    const name = `fit-settings-${date}.json`;
    saveAs(new Blob([file.text], { type: "application/json" }), name);
    setMessage({ text: `Saved as ${name}.`, error: false });
  };

  const load = async (file: File) => {
    const result = fitFromFile(await file.text());
    if ("error" in result) {
      setMessage({ text: result.error, error: true });
      return;
    }
    setMessage({ text: `Loaded ${file.name}.`, error: false, undo: fit });
    onReplace(result.fit);
  };

  // Undo instead of a confirmation: the reset is one click away from being undone.
  const reset = () => {
    setMessage({ text: "All fit settings are back to nominal.", error: false, undo: fit });
    onReplace(NOMINAL_FIT);
  };

  return (
    <>
      <div className="actions">
        {children}
        <button type="button" className="button secondary" onClick={save}>
          Save to file
        </button>
        <button type="button" className="button secondary" onClick={() => fileInput.current?.click()}>
          Load from file
        </button>
        <button type="button" className="button secondary" onClick={reset}>
          Reset all to nominal
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // so the same file can be loaded again
            if (file) void load(file);
          }}
        />
      </div>
      {message && (
        <p role={message.error ? "alert" : "status"} className={message.error ? "alert" : "note"}>
          {message.text}{" "}
          {undo && (
            <button
              type="button"
              className="link"
              onClick={() => {
                onReplace(undo);
                setMessage(null);
              }}
            >
              Undo
            </button>
          )}
        </p>
      )}
    </>
  );
}

interface FitSettingsProps {
  open: boolean;
  onClose: () => void;
  fit: Fit;
  onType: (key: ClearanceKey, text: string) => void;
  onReplace: (fit: Fit) => void;
}

export default function FitSettings({ open, onClose, fit, onType, onReplace }: FitSettingsProps) {
  const state = readClearance(fit.text);

  return (
    <Dialog open={open} onClose={onClose} title="Fit settings" className="fit-dialog">
      <p className="note">
        Corrections for your printer or CNC machine, in mm: positive makes a feature bigger. Every part uses the ones it
        needs; the {SPEC.pitch} mm spacing of holes and studs never changes. The{" "}
        <a href="#calibrate" onClick={onClose}>
          Calibrate
        </a>{" "}
        section finds them. They are kept in this browser only: save them to a file to keep them safe or to use them in
        another browser.
      </p>
      <div className="fit-fields">
        {CLEARANCE_FIELDS.map((f) => (
          <Field
            key={f.key}
            id={`fit-${f.key}`}
            label={f.label}
            hint={f.hint}
            aside={<span className="origin">{statusText(fieldStatus(fit, f.key))}</span>}
            invalid={state.invalid.includes(f.key)}
            value={fit.text[f.key]}
            onChange={(text) => onType(f.key, text)}
            type="text"
            inputMode="decimal"
          />
        ))}
      </div>
      {state.problem && (
        <p role="alert" className="alert">
          {state.problem}
        </p>
      )}
      {/* Mounted only while open, so an earlier message doesn't greet the next visit. */}
      {open && <FitFileActions fit={fit} onReplace={onReplace} />}
    </Dialog>
  );
}

// The fit settings at the top of the Calibrate section: how many are calibrated,
// and the file actions in view, since that is where the values are made.
export function FitCard({ fit, onEdit, onReplace }: { fit: Fit; onEdit: () => void; onReplace: (fit: Fit) => void }) {
  const calibrated = CLEARANCE_FIELDS.filter((f) => fieldStatus(fit, f.key).kind === "calibrated").length;
  return (
    <section className="fit-card" aria-labelledby="fit-card-title">
      <div>
        <h2 id="fit-card-title">Your fit settings</h2>
        <p className="note">
          {calibrated} of {CLEARANCE_FIELDS.length} calibrated. They are kept in this browser only: save them to a file
          to keep them safe or to use them in another browser.
        </p>
      </div>
      <FitFileActions fit={fit} onReplace={onReplace}>
        <button type="button" className="button secondary" aria-haspopup="dialog" onClick={onEdit}>
          Edit values
        </button>
      </FitFileActions>
    </section>
  );
}

// The header's button that opens the fit settings: an icon and a word, so it reads
// as a button, and a tag with how many values aren't zero, or how many need
// correcting (an invalid value blocks the parts that use it).
export function FitButton({ adjusted, invalid, onClick }: { adjusted: number; invalid: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className="fit-button"
      aria-haspopup="dialog"
      title="Edit, save, load or reset your fit settings"
      onClick={onClick}
    >
      <svg className="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="M2 4h7M13 4h1M2 12h1M7 12h7" />
        <circle cx="11" cy="4" r="2" />
        <circle cx="5" cy="12" r="2" />
      </svg>
      Fit settings
      {invalid > 0 ? (
        <span className="tag invalid">{invalid} invalid</span>
      ) : (
        <span className="tag">{adjusted > 0 ? `${adjusted} adjusted` : "nominal"}</span>
      )}
    </button>
  );
}

interface FitBoxProps {
  keys: readonly ClearanceKey[]; // the settings the part uses with its parameters (settingsUsed)
  fit: Fit;
  adjusted: boolean; // a value the part uses isn't zero
  summary: SummaryItem[] | null;
  onEdit: () => void;
}

// The fit settings the current part uses, on the Parts section. They change
// every download, so they are always in view, with where each came from.
export function FitBox({ keys, fit, adjusted, summary, onEdit }: FitBoxProps) {
  const fields = CLEARANCE_FIELDS.filter((f) => keys.includes(f.key));
  const missing = fields.find((f) => fieldStatus(fit, f.key).kind === "none");
  const step = missing && stepFor(missing.key);

  return (
    <section className="fit-box" aria-labelledby="fit-box-title">
      <div className="fit-head">
        <h2 id="fit-box-title">Fit settings</h2>
        <button type="button" className="link" onClick={onEdit}>
          Edit
        </button>
      </div>
      <dl className="fit-list">
        {fields.map((f) => (
          <div key={f.key}>
            <dt>{f.name}</dt>
            <dd>
              <span className={valueText(fit, f.key) === "invalid" ? "fit-value invalid" : "fit-value"}>
                {valueText(fit, f.key)}
              </span>
              <span className="origin">{statusText(fieldStatus(fit, f.key))}</span>
            </dd>
          </div>
        ))}
      </dl>
      {step && (
        <p className="note">
          Values not calibrated are nominal. <a href={stepHash(step.id)}>Calibrate them</a>
        </p>
      )}
      {adjusted && <p className="note">A value isn't zero, so the file name ends in “-adjusted”.</p>}
      {summary && (
        <details className="sizes">
          <summary>Resulting sizes</summary>
          <dl className="stats">
            {summary.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </section>
  );
}
