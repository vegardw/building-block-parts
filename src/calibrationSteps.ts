// The Calibrate section's steps (pure, no CAD import). Four steps make a
// calibration part and save the feature that fits best; the fifth measures a
// printed beam. They are independent (each tests against genuine parts), so the
// order is a recommendation: the most common problem first.
import { SPEC, EPS, clearanceField, type ClearanceKey } from "./spec";
import type { ParamValues } from "./parts/types";
import { FULL } from "./parts/beam";
import { fieldStatus, type Fit } from "./fit";

export type StepId = "hole" | "axle" | "pin" | "collar" | "size";

export interface CalibrationStep {
  id: StepId;
  title: string;
  guide: string; // its section in docs/calibration.md: the heading after "### N. "
  partId: string; // the part made in this step
  settings: readonly ClearanceKey[]; // the fit settings it finds
  params?: ParamValues; // fixed parameters (the test beam); otherwise the part's form
}

// A non-empty tuple, so the first step (the default) always exists.
export const CALIBRATION_STEPS: [CalibrationStep, ...CalibrationStep[]] = [
  { id: "hole", title: "Hole diameter", guide: "Hole calibration bar", partId: "calibration", settings: ["hole"] },
  { id: "axle", title: "Axle size", guide: "Calibration axle", partId: "axle-calibration", settings: ["axle"] },
  { id: "pin", title: "Pin diameter", guide: "Pin calibration bar", partId: "pin-calibration", settings: ["pin"] },
  {
    id: "collar",
    title: "Collar diameter",
    guide: "Collar calibration bar",
    partId: "collar-calibration",
    settings: ["collar"],
  },
  // A full beam at nominal size, long enough to measure away from its ends.
  {
    id: "size",
    title: "Beam width and height",
    guide: "Beam width and height",
    partId: "beam",
    settings: ["width", "height"],
    params: { holes: 5, height: FULL },
  },
];

export const getStep = (id: string): CalibrationStep | undefined => CALIBRATION_STEPS.find((s) => s.id === id);

export function requireStep(id: StepId): CalibrationStep {
  const step = getStep(id);
  if (!step) throw new Error(`Unknown step: ${id}`);
  return step;
}

// The step that finds a setting, for "calibrate" links next to a part's fit settings.
export const stepFor = (key: ClearanceKey): CalibrationStep | undefined =>
  CALIBRATION_STEPS.find((s) => s.settings.includes(key));

// A step is calibrated when every setting it finds is; "hand" when none is but
// one was typed in; "none" when all are still nominal.
export type StepState = "calibrated" | "partly" | "hand" | "none";

export function stepState(fit: Fit, step: CalibrationStep): StepState {
  const kinds = step.settings.map((key) => fieldStatus(fit, key).kind);
  if (kinds.every((k) => k === "calibrated")) return "calibrated";
  if (kinds.includes("calibrated")) return "partly";
  return kinds.includes("hand") ? "hand" : "none";
}

// Whether the picked feature is the first or last: the best fit may lie beyond it.
export const atEnd = (index: number, count: number): boolean => index === 0 || index === count - 1;

// The nominal sizes the test beam is measured against.
export const MEASURED = { width: SPEC.width, height: SPEC.height } as const;

// A measured size -> the setting that corrects it: the error with the opposite
// sign, to 0.01 mm (calipers' resolution). A message if it is beyond the
// setting's limit, which more likely means a misread than a machine that far off.
export function fromMeasured(key: "width" | "height", measured: number): { value: number } | { error: string } {
  const field = clearanceField(key);
  const value = Number((MEASURED[key] - measured).toFixed(2)) + 0; // + 0 turns -0 into 0
  if (Math.abs(value) > field.limit + EPS) {
    return {
      error: `${measured} mm is ${Math.abs(value).toFixed(2)} mm from the nominal ${MEASURED[key]} mm; the ${field.name.toLowerCase()} setting allows ±${field.limit} mm. Check the measurement.`,
    };
  }
  return { value };
}

// One section of the calibration guide, for the step's "Test" card: the text
// under the "### N. <title>" heading, without the heading, up to the next heading.
export function guideSection(markdown: string, title: string): string | null {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => l.startsWith("### ") && l.replace(/^### \d+\.\s*/, "").startsWith(title));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && /^#{1,3} /.test(l));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join("\n")
    .trim();
}
