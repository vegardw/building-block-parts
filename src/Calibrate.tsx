// The Calibrate section: an introduction with "Download all", the steps with
// their status, the step's part (in the panel beside the preview) and its Test
// and Result cards. Results are saved straight into the fit settings.
import { useState, type CSSProperties } from "react";

import { Field, ParamFields } from "./fields";
import { EPS, clearanceField, type ClearanceKey } from "./spec";
import { formatClearance, readClearance } from "./clearance";
import { parseNumber } from "./parseNumber";
import { fieldStatus, type Fit } from "./fit";
import {
  CALIBRATION_STEPS,
  STEP_GROUPS,
  MEASURED,
  atEnd,
  fromMeasured,
  stepState,
  type CalibrationStep,
  type StepId,
} from "./calibrationSteps";
import { calibrationClearances, type CalibrationParams } from "./parts/calibration";
import type { CalibrationSpec, ParamText, ParamValues, PartDefinition } from "./parts/types";
import { statusText, valueText } from "./FitSettings";
import { GUIDE_FAILED } from "./CalibrationGuide";
import { SOURCE_URL } from "./links";

// Saves values found in a step as calibrated fit settings.
export type SaveResult = (values: Partial<Record<ClearanceKey, number>>) => void;

const fieldName = (key: ClearanceKey) => clearanceField(key).name.toLowerCase();

// "Your hole diameter: +0.10 mm, calibrated 31 Oct 2026." for each setting.
function Saved({ fit, keys }: { fit: Fit; keys: readonly ClearanceKey[] }) {
  return (
    <p className="note" role="status">
      {keys
        .map((key) => `Your ${fieldName(key)}: ${valueText(fit, key)}, ${statusText(fieldStatus(fit, key))}.`)
        .join(" ")}
    </p>
  );
}

export function CalibrateIntro({
  onDownloadAll,
  problem,
  error,
  disabled,
}: {
  onDownloadAll: () => void;
  problem: string | null; // why the calibration parts can't be made now
  error: string | null; // why the last "Download all" failed, shown by its button
  disabled: boolean;
}) {
  return (
    <section className="intro" aria-labelledby="calibrate-title">
      <h2 id="calibrate-title">Calibrate your printer or CNC machine</h2>
      <p>
        Make each calibration part with the same machine, material and settings as your real parts, test it against
        genuine parts and pick what fits best. The results are saved as your fit settings and used by every part. The{" "}
        <a href="#guide">calibration guide</a> has the details.
      </p>
      <div className="intro-actions">
        <button type="button" className="button secondary" onClick={onDownloadAll} disabled={disabled}>
          Download all calibration parts
        </button>
        <span className="note">
          {problem ??
            "One file with the calibration parts side by side, each made with the settings chosen for it in its step. The file type is chosen above the download button."}
        </span>
      </div>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
    </section>
  );
}

const STATE_TEXT = {
  calibrated: "calibrated",
  partly: "partly calibrated",
  hand: "set by hand",
  none: "not calibrated",
};

// The steps in their groups, numbered straight through. Each group spans as many
// columns as it has steps, so the steps line up across the groups.
export function StepList({ fit, current, onSelect }: { fit: Fit; current: StepId; onSelect: (id: StepId) => void }) {
  return (
    <div className="step-groups" role="group" aria-label="Calibration steps">
      {STEP_GROUPS.map((group) => {
        const steps = CALIBRATION_STEPS.filter((s) => s.group === group.id);
        return (
          <section
            key={group.id}
            className="step-group"
            style={{ "--steps": steps.length } as CSSProperties}
            aria-labelledby={`steps-${group.id}`}
          >
            <h3 id={`steps-${group.id}`} className="step-group-title">
              {group.title}
            </h3>
            <ol className="steps">
              {steps.map((step) => (
                <StepItem
                  key={step.id}
                  step={step}
                  number={CALIBRATION_STEPS.indexOf(step) + 1}
                  fit={fit}
                  current={step.id === current}
                  onSelect={onSelect}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function StepItem({
  step,
  number,
  fit,
  current,
  onSelect,
}: {
  step: CalibrationStep;
  number: number;
  fit: Fit;
  current: boolean;
  onSelect: (id: StepId) => void;
}) {
  const state = stepState(fit, step);
  const values = step.settings.map((key) => valueText(fit, key)).join(" / ");
  return (
    <li>
      <button
        type="button"
        className="step"
        aria-current={current ? "step" : undefined}
        onClick={() => onSelect(step.id)}
      >
        <span className={`step-number ${state}`} aria-hidden="true">
          {state === "calibrated" ? "✓" : number}
        </span>
        <span className="step-text">
          <span className="step-title">{step.title}</span>
          <span className="step-status">{state === "none" ? STATE_TEXT.none : `${values} · ${STATE_TEXT[state]}`}</span>
        </span>
      </button>
    </li>
  );
}

// The left panel: what to make in this step.
export function StepPanel({
  step,
  part,
  text,
  error,
  onParam,
}: {
  step: CalibrationStep;
  part: PartDefinition;
  text: ParamText;
  error: { key: string; message: string } | null; // shown under the parameter it names
  onParam: (key: string, text: string) => void;
}) {
  return (
    <>
      <div>
        <p className="eyebrow">1 · Make</p>
        <h2 className="panel-title">{step.params ? "Test beam" : part.name}</h2>
        <p className="note">
          {step.params
            ? `A ${step.params.holes}-hole beam at nominal size, to measure. Any full-height beam made with zero width and height settings will do.`
            : `Finds your ${step.title.toLowerCase()}. Make it as you will make real parts: same machine, material, settings and orientation.`}
        </p>
      </div>
      {!step.params && <ParamFields part={part} text={text} error={error} onChange={onParam} />}
    </>
  );
}

interface StepDetailProps {
  step: CalibrationStep;
  part: PartDefinition;
  params: ParamValues;
  valid: boolean; // the part's settings are valid, so its features are known
  fit: Fit;
  guideHtml: string | null;
  guideFailed: boolean;
  onSave: SaveResult;
  onCentre: (value: number) => void;
  check: CheckDownload | null; // the step's check set (step.check), if it has one
}

// The download of a step's check set, wired up by the app like its other downloads.
export interface CheckDownload {
  onDownload: () => void;
  label: string;
  fileName: string | null; // null while it can't be made
  problem: string | null; // why it can't be made, or why the last download failed
  disabled: boolean;
}

// The Test card (the guide's section for the step) and the Result card.
export function StepDetail({
  step,
  part,
  params,
  valid,
  fit,
  guideHtml,
  guideFailed,
  onSave,
  onCentre,
  check,
}: StepDetailProps) {
  return (
    <div className="step-detail">
      <section className="card" aria-labelledby="test-title">
        <p className="eyebrow">2 · Test</p>
        <h2 id="test-title">How to test it</h2>
        {guideHtml ? (
          <div className="guide" dangerouslySetInnerHTML={{ __html: guideHtml }} />
        ) : (
          <p className="note">{guideFailed ? GUIDE_FAILED : "Loading…"}</p>
        )}
      </section>
      <section className="card" aria-labelledby="result-title">
        <p className="eyebrow">3 · Result</p>
        <h2 id="result-title">{step.params ? "Enter what you measured" : "Pick what fits best"}</h2>
        {step.params ? (
          <Measure fit={fit} keys={step.settings} onSave={onSave} />
        ) : valid && part.calibration ? (
          <Picker
            key={step.id}
            partId={part.id}
            spec={part.calibration}
            params={params as CalibrationParams}
            fit={fit}
            onSave={onSave}
            onCentre={onCentre}
          />
        ) : (
          <p className="note">Correct the part's settings to see its {part.calibration?.feature}s.</p>
        )}
        {check && <CheckSetBox check={check} />}
      </section>
    </div>
  );
}

// Real parts made with the fit settings. For now only the underside step has a
// check set (calibrationSteps.ts), so the words are written for its bricks.
function CheckSetBox({ check }: { check: CheckDownload }) {
  return (
    <div className="check-set">
      <h3>Check your settings</h3>
      <p>
        A 1 × 1, a 1 × 2 and a 2 × 2 brick and a 1 × 2 brick with holes, made with your fit settings, in one file. Try
        each on genuine studs, put genuine bricks on them, and stack them on each other. The 2 × 2 holds a stud with a
        tube and ribs, like the calibration bar's sections; the 1 × 1 with its walls alone, the 1 × 2 with its walls and
        a bar. Put a genuine pin through the brick with holes: printed studs up, its hole lies across, unlike the hole
        bar's. If the 1 × 1 or the 1 × 2 holds noticeably more or less firmly than the 2 × 2, or the pin fits
        differently than in a printed beam,{" "}
        <a href={`${SOURCE_URL}/issues`} target="_blank" rel="noreferrer">
          please report it
        </a>
        : those parts may need a setting of their own.
      </p>
      <button type="button" className="button secondary" onClick={check.onDownload} disabled={check.disabled}>
        {check.label}
      </button>
      {check.fileName && <p className="note">{check.fileName}</p>}
      {check.problem && (
        <p role="alert" className="alert">
          {check.problem}
        </p>
      )}
    </div>
  );
}

// The features of the part, in the order they are on it: click the one that fits best.
function Picker({
  partId,
  spec,
  params,
  fit,
  onSave,
  onCentre,
}: {
  partId: string;
  spec: CalibrationSpec;
  params: CalibrationParams;
  fit: Fit;
  onSave: SaveResult;
  onCentre: (value: number) => void;
}) {
  const values = calibrationClearances(params);
  const middle = (values.length - 1) / 2;
  // The value is kept, not the position, so the pick survives a change of the
  // middle value (it moves to the middle) and is dropped if it is no longer made.
  const [picked, setPicked] = useState<number | null>(null);
  const [centred, setCentred] = useState<number | null>(null); // the value just put in the middle
  const index = picked === null ? -1 : values.findIndex((v) => Math.abs(v - picked) < EPS);
  const value = values[index]; // undefined if nothing is picked

  const status = fieldStatus(fit, spec.setting);
  const saved = readClearance(fit.text, [spec.setting]).clearance?.[spec.setting];
  const isSaved = (v: number) => status.kind !== "none" && saved !== undefined && Math.abs(v - saved) < EPS;
  const name = fieldName(spec.setting);

  return (
    <>
      <p>
        Pick {spec.best}. They are in the same order as on the part; count from either end
        {spec.tabs ? " or from the tabs" : " or from the middle"}.
      </p>
      <fieldset className="picker">
        <legend className="visually-hidden">
          {`${spec.feature}s from the ${spec.ends[0]} to the ${spec.ends[1]}`}
        </legend>
        <span className="picker-end first" aria-hidden="true">
          {spec.ends[0]}
        </span>
        <span className="picker-end last" aria-hidden="true">
          {spec.ends[1]}
        </span>
        <div className="picker-row" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(3.25rem, 1fr))` }}>
          {values.map((v, k) => {
            const marks = [k === middle ? (spec.tabs ? "tabs" : "middle") : "", isSaved(v) ? "saved" : ""].filter(
              Boolean,
            );
            return (
              <label key={k} className={isSaved(v) ? "pick saved" : "pick"}>
                <input type="radio" name={`pick-${partId}`} checked={k === index} onChange={() => setPicked(v)} />
                <span className="pick-number">{k + 1}</span>
                <span className="pick-value">{formatClearance(v)}</span>
                <span className="pick-mark">{marks.join(" · ") || " "}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {value !== undefined && (
        <div className="pick-result">
          {atEnd(index, values.length) && (
            <p className="note">
              This is the {spec.feature} at the {index === 0 ? spec.ends[0] : spec.ends[1]}: the best fit may lie beyond
              it. To check, make the part again with this value in the middle.{" "}
              <button
                type="button"
                className="link"
                onClick={() => {
                  onCentre(value);
                  setCentred(value);
                }}
              >
                Put {formatClearance(value)} mm in the middle
              </button>
            </p>
          )}
          {centred !== null && Math.abs(params.centre - centred) < EPS && (
            <p className="note" role="status">
              Step 1 now makes the part with {formatClearance(centred)} mm in the middle: download it there.
            </p>
          )}
          <button
            type="button"
            className="button"
            disabled={status.kind === "calibrated" && isSaved(value)}
            onClick={() => onSave({ [spec.setting]: value })}
          >
            Use {formatClearance(value)} mm as your {name}
          </button>
        </div>
      )}
      <Saved fit={fit} keys={[spec.setting]} />
      <p className="note">
        The values are those of the part as set in step 1. If you made yours with other settings, set them back first.
      </p>
    </>
  );
}

type Measurement = { value: number | null; error: string | null };

// The test beam's measured width and height -> the settings that correct them.
function Measure({ fit, keys, onSave }: { fit: Fit; keys: readonly ClearanceKey[]; onSave: SaveResult }) {
  const [text, setText] = useState({ width: "", height: "" });

  const read = (key: "width" | "height"): Measurement => {
    const typed = text[key].trim();
    if (!typed) return { value: null, error: null };
    const measured = parseNumber(typed);
    if (measured === null || measured <= 0) return { value: null, error: "Enter the measurement in mm, e.g. 7.25." };
    const result = fromMeasured(key, measured);
    return "error" in result ? { value: null, error: result.error } : { value: result.value, error: null };
  };
  const results = { width: read("width"), height: read("height") };
  const entered = (["width", "height"] as const).flatMap((key) => {
    const { value } = results[key];
    return value === null ? [] : [[key, value] as const];
  });
  const ready = entered.length > 0 && !results.width.error && !results.height.error;

  const line = (key: "width" | "height") => {
    const { value, error } = results[key];
    if (error) return <p className="alert">{error}</p>;
    if (value === null) return null;
    return (
      <p className="note">
        {clearanceField(key).name}: <strong>{formatClearance(value)} mm</strong>
      </p>
    );
  };

  return (
    <>
      <p>
        Measure the test beam with calipers, away from its ends. The settings are the differences from nominal with the
        opposite sign. Leave a field empty to keep that setting.
      </p>
      <Field
        id="measured-width"
        label="Measured width (mm)"
        hint={`Across the flat sides; nominal ${MEASURED.width} mm.`}
        invalid={!!results.width.error}
        value={text.width}
        onChange={(t) => setText((prev) => ({ ...prev, width: t }))}
        type="text"
        inputMode="decimal"
      />
      {line("width")}
      <Field
        id="measured-height"
        label="Measured height (mm)"
        hint={`The thickness along the holes; nominal ${MEASURED.height} mm.`}
        invalid={!!results.height.error}
        value={text.height}
        onChange={(t) => setText((prev) => ({ ...prev, height: t }))}
        type="text"
        inputMode="decimal"
      />
      {line("height")}
      <button type="button" className="button" disabled={!ready} onClick={() => onSave(Object.fromEntries(entered))}>
        Use {entered.length === 1 ? "this value" : "these values"}
      </button>
      <Saved fit={fit} keys={keys} />
    </>
  );
}
