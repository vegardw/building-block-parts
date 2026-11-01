// The part registry (pure: no CAD import, safe for the UI bundle).
//
// A part is a PartDefinition (see types.ts). Its CAD code lives in a separate
// file and is registered in builders.ts.
import beam from "./beam";
import calibration from "./calibration";
import axle from "./axle";
import axleCalibration from "./axleCalibration";
import collarCalibration from "./collarCalibration";
import pin from "./pin";
import pinCalibration from "./pinCalibration";
import { NO_CLEARANCE, CLEARANCE_FIELDS, EPS, type Clearance } from "../spec";
import { parseNumber } from "../parseNumber";
import type { ParamText, ParamValues, PartDefinition } from "./types";

export const PARTS: PartDefinition[] = [
  beam,
  axle,
  pin,
  calibration,
  axleCalibration,
  pinCalibration,
  collarCalibration,
];

// The parts listed under Parts. Calibration parts stay in PARTS (they are built
// and tested like the others) but are made from the Calibrate section.
export const REGULAR_PARTS: PartDefinition[] = PARTS.filter((p) => !p.calibration);

// The part shown when none is chosen yet: the first under Parts (a test checks it).
export const DEFAULT_PART: PartDefinition = beam;

export const getPart = (id: string): PartDefinition | undefined => PARTS.find((p) => p.id === id);

export function requirePart(id: string): PartDefinition {
  const part = getPart(id);
  if (!part) throw new Error(`Unknown part: ${id}`);
  return part;
}

export const defaultText = (part: PartDefinition): ParamText =>
  Object.fromEntries(part.params.map((p) => [p.key, String(p.default)]));

// Form text -> numbers (NaN where the text isn't a number).
export function parseParams(part: PartDefinition, text: ParamText): ParamValues {
  return Object.fromEntries(
    part.params.map((p) => {
      return [p.key, parseNumber(text[p.key] ?? "") ?? NaN];
    }),
  );
}

// A number in a message, with the typographic minus the app displays.
const shown = (n: number): string => (n < 0 ? `−${-n}` : String(n));

// Whether v lies on a stepped parameter's grid (min, min + step, ...), allowing for float noise.
const onGrid = (v: number, min: number, step: number): boolean => {
  const k = (v - min) / step;
  return Math.abs(k - Math.round(k)) < 1e-9;
};

// The first parameter outside its own range or off its step grid, with its
// message, or null. The form shows the message under that field.
export function paramProblem(part: PartDefinition, params: ParamValues): { key: string; message: string } | null {
  for (const p of part.params) {
    const v = params[p.key] ?? NaN; // a missing parameter is invalid like any other non-number
    if (p.type === "choice") {
      if (!p.options.some((o) => o.value === v)) return { key: p.key, message: `Choose a value for ${p.label}.` };
      continue;
    }
    const ok = Number.isFinite(v) && (p.type !== "int" || Number.isInteger(v)) && v >= p.min && v <= p.max;
    if (!ok) {
      const message = `${p.label} must be ${p.type === "int" ? "a whole number" : "a number"} from ${shown(p.min)} to ${shown(p.max)}.`;
      return { key: p.key, message };
    }
    if (p.step && !onGrid(v, p.min, p.step)) {
      return {
        key: p.key,
        message: `${p.label} must be a number from ${shown(p.min)} to ${shown(p.max)}, in steps of ${p.step}.`,
      };
    }
  }
  return null;
}

// Returns an error message, or null if the part can be built.
export function validatePart(
  part: PartDefinition,
  params: ParamValues,
  clearance: Clearance = NO_CLEARANCE,
): string | null {
  const param = paramProblem(part, params);
  if (param) return param.message;
  for (const f of CLEARANCE_FIELDS) {
    const v = clearance[f.key];
    if (part.clearance.includes(f.key) && !(Number.isFinite(v) && Math.abs(v) <= f.limit + EPS)) {
      return `${f.name} clearance must be a number from −${f.limit} to ${f.limit} mm.`;
    }
  }
  return part.validate?.(params, clearance) ?? null;
}
