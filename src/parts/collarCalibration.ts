// Collar calibration bar: round buttons with graduated diameters on a bar, the
// size of the collars and stops that sit in a counterbore. Laying a genuine beam
// across the bar shows which button seats in its counterbore with a little play.
// Same layout as the other calibration bars: the middle button has the middle
// value, smaller towards the flat end, larger towards the rounded end, tabs beside the middle.
import { SPEC, COLLAR_SIZE_LIMIT } from "../spec";
import { calibrationInfo, centreParam, centreSuffix, rangeProblem, type CalibrationParams } from "./calibration";
import type { CalibrationSpec, PartDefinition } from "./types";

// 8 mm apart: a beam laid across the bar (7.2 wide) touches only one button.
export const BUTTON_PITCH = SPEC.pitch;
// Lower than the 0.8 mm counterbore depth, so only the diameter decides the fit.
export const BUTTON_HEIGHT = 0.6;

const spec: CalibrationSpec = {
  setting: "collar",
  feature: "button",
  ends: ["flat end", "rounded end"],
  tabs: true,
  best: "the largest button that lets a genuine beam lie flat on the bar, with a little play",
};

const collarCalibration: PartDefinition<CalibrationParams> = {
  id: "collar-calibration",
  name: "Collar calibration bar",
  clearance: [], // it sets its own collar sizes
  calibration: spec,
  params: [
    {
      key: "perSide",
      label: "Buttons on each side of the middle button",
      type: "int",
      min: 1,
      max: 7,
      step: 1,
      default: 4,
    },
    { key: "step", label: "Size step (mm)", type: "number", min: 0.01, max: 0.2, default: 0.05 },
    centreParam("button", COLLAR_SIZE_LIMIT),
  ],

  validate(params) {
    return rangeProblem(params, COLLAR_SIZE_LIMIT, "buttons");
  },

  info(params) {
    return calibrationInfo(params, spec);
  },

  filename: ({ perSide, centre }) => `collar-calibration-${2 * perSide + 1}-buttons${centreSuffix(centre)}`,
};

export default collarCalibration;
