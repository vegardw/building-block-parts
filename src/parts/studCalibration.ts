// Stud calibration bar: a row of studs with graduated diameters on a bar, so one
// print shows which stud diameter grips like a genuine one. A genuine 1 × 1 plate
// pressed onto each stud is the gauge. Same layout as the other calibration bars:
// the middle stud has the middle value, smaller towards the flat end, larger
// towards the rounded end, tabs beside the middle.
import { SPEC, STUD_SIZE_LIMIT } from "../spec";
import { calibrationInfo, centreParam, centreSuffix, rangeProblem, type CalibrationParams } from "./calibration";
import type { CalibrationSpec, PartDefinition } from "./types";

// The stud pitch: a 1 × 1 plate (7.8 wide) pressed onto one stud clears the next.
export const STUD_PITCH = SPEC.pitch;

const spec: CalibrationSpec = {
  setting: "stud",
  feature: "stud",
  ends: ["flat end", "rounded end"],
  tabs: true,
  best: "the stud on which a genuine 1 × 1 plate holds most like it does on a genuine brick (of two that are close, the smaller)",
};

const studCalibration: PartDefinition<CalibrationParams> = {
  id: "stud-calibration",
  name: "Stud calibration bar",
  clearance: [], // it sets its own stud sizes
  calibration: spec,
  params: [
    {
      key: "perSide",
      label: "Studs on each side of the middle stud",
      type: "int",
      min: 1,
      max: 7,
      step: 1,
      default: 4,
    },
    { key: "step", label: "Size step (mm)", type: "number", min: 0.01, max: 0.2, default: 0.05 },
    centreParam("stud", STUD_SIZE_LIMIT),
  ],

  validate(params) {
    return rangeProblem(params, STUD_SIZE_LIMIT, "studs");
  },

  info(params) {
    return calibrationInfo(params, spec);
  },

  filename: ({ perSide, centre }) => `stud-calibration-${2 * perSide + 1}-studs${centreSuffix(centre)}`,
};

export default studCalibration;
