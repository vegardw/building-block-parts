// Pin calibration bar: round stubs with graduated diameters standing on a bar,
// so one print shows which pin diameter turns freely in genuine holes. Same
// layout as the other calibration bars: the middle stub has the middle value,
// smaller towards the flat end, larger towards the rounded end, tabs beside the middle.
import { SPEC, PIN_SIZE_LIMIT } from "../spec";
import { calibrationInfo, centreParam, centreSuffix, rangeProblem, type CalibrationParams } from "./calibration";
import type { CalibrationSpec, PartDefinition } from "./types";

// Two studs apart, so a beam slid onto one stub clears the next; tall enough to
// pass through a full beam.
export const STUB_PITCH = 2 * SPEC.pitch;
export const STUB_LENGTH = SPEC.pitch;

const spec: CalibrationSpec = {
  setting: "pin",
  feature: "stub",
  ends: ["flat end", "rounded end"],
  tabs: true,
  best: "the largest stub on which a genuine beam turns freely without wobble",
};

const pinCalibration: PartDefinition<CalibrationParams> = {
  id: "pin-calibration",
  name: "Pin calibration bar",
  clearance: [], // it sets its own pin sizes
  calibration: spec,
  params: [
    {
      key: "perSide",
      label: "Stubs on each side of the middle stub",
      type: "int",
      min: 1,
      max: 7,
      step: 1,
      default: 4,
    },
    { key: "step", label: "Size step (mm)", type: "number", min: 0.01, max: 0.2, default: 0.05 },
    centreParam("stub", PIN_SIZE_LIMIT),
  ],

  validate(params) {
    return rangeProblem(params, PIN_SIZE_LIMIT, "stubs");
  },

  info(params) {
    return calibrationInfo(params, spec);
  },

  filename: ({ perSide, centre }) => `pin-calibration-${2 * perSide + 1}-stubs${centreSuffix(centre)}`,
};

export default pinCalibration;
