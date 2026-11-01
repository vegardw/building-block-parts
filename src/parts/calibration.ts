// Hole calibration bar: a row of pin holes with graduated clearance, so one
// print shows which hole diameter fits axles and pins on your printer or CNC.
// The middle hole has the middle value (0, nominal, by default). Smaller values
// are on the flat end, larger ones on the rounded end. Tabs on both sides mark
// the middle hole. Also holds what the calibration parts share.
import { SPEC, MIN_WALL, EPS } from "../spec";
import { formatClearance } from "../clearance";
import type { CalibrationSpec, NumberParamDef, PartDefinition } from "./types";

export type CalibrationParams = { perSide: number; step: number; centre: number };

export const TAB = { width: 1.5, depth: 0.8 }; // marker beside the middle hole

// Largest clearance that keeps the counterbore wall at MIN_WALL or more.
export const MAX_CLEARANCE = SPEC.width - SPEC.cboreD - 2 * MIN_WALL;

// Value of each feature, from the smaller end to the larger; the middle one is `centre`.
export function calibrationClearances({ perSide, step, centre }: CalibrationParams): number[] {
  return Array.from({ length: 2 * perSide + 1 }, (_, k) => Number((centre + (k - perSide) * step).toFixed(4)));
}

// The middle value lets a second part look beyond the end of the first, or
// resolve finer steps around its result. Every value must stay within ±limit.
export function centreParam(feature: string, limit: number): NumberParamDef {
  return {
    key: "centre",
    label: "Middle value (mm)",
    type: "number",
    min: -limit,
    max: limit,
    default: 0,
    hint: `The value of the middle ${feature}. Leave it at 0 (nominal), or set it to an earlier result to look beyond the end of a part or to refine it.`,
  };
}

// A message when a feature's value would pass ±limit, or null. `features` names
// them in the plural, `why` explains the limit when it isn't obvious.
export function rangeProblem(params: CalibrationParams, limit: number, features: string, why = ""): string | null {
  const values = calibrationClearances(params);
  const worst = values.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a));
  if (Math.abs(worst) <= limit + EPS) return null;
  return `The values would reach ${formatClearance(worst)} mm, beyond the limit of ±${limit.toFixed(2)} mm${why}. Use a smaller step, fewer ${features} or a middle value nearer 0.`;
}

// "-plus-0.20" or "-minus-0.10" for a part centred off nominal, so its file
// doesn't overwrite the nominal one.
export const centreSuffix = (centre: number): string =>
  centre === 0 ? "" : `-${centre > 0 ? "plus" : "minus"}-${Math.abs(centre).toFixed(2)}`;

// Values from one end to the other, for the note under the settings.
export function calibrationInfo(params: CalibrationParams, { feature, ends, tabs }: CalibrationSpec): string {
  const values = calibrationClearances(params);
  const [first, last] = [values[0], values[values.length - 1]].map((v) => formatClearance(v ?? params.centre)); // never empty
  return (
    `${values.length} ${feature}s, from ${first} mm at the ${ends[0]} to ${last} mm at the ${ends[1]}; ` +
    `the middle ${feature}${tabs ? ", marked by the tabs," : ""} is ${formatClearance(params.centre)} mm.`
  );
}

const spec: CalibrationSpec = {
  setting: "hole",
  feature: "hole",
  ends: ["flat end", "rounded end"],
  tabs: true,
  best: "the smallest hole in which a pin without friction ribs turns freely without noticeable wobble",
};

const calibration: PartDefinition<CalibrationParams> = {
  id: "calibration",
  name: "Hole calibration bar",
  clearance: [], // it sets its own hole clearances
  calibration: spec,
  params: [
    {
      key: "perSide",
      label: "Holes on each side of the middle hole",
      type: "int",
      min: 1,
      max: 7,
      step: 1,
      default: 4,
    },
    { key: "step", label: "Clearance step (mm)", type: "number", min: 0.01, max: 0.2, default: 0.05 },
    centreParam("hole", MAX_CLEARANCE),
  ],

  validate(params) {
    return rangeProblem(
      params,
      MAX_CLEARANCE,
      "holes",
      `, which keeps the counterbore walls at least ${MIN_WALL} mm thick`,
    );
  },

  info(params) {
    return calibrationInfo(params, spec);
  },

  filename: ({ perSide, centre }) => `hole-calibration-${2 * perSide + 1}-holes${centreSuffix(centre)}`,
};

export default calibration;
