// Calibration axle: an axle whose cross gets larger one section at a time, with
// a stop at the large end. Made the same way as a real axle, it is slid into a
// genuine axle hole small end first: the largest section that goes in with
// light force gives the axle size. Each section is one stud long, and the middle
// one has the middle value.
import { SPEC, AXLE_SIZE_LIMIT } from "../spec";
import { calibrationInfo, centreParam, centreSuffix, rangeProblem, type CalibrationParams } from "./calibration";
import type { CalibrationSpec, PartDefinition } from "./types";

export const SECTION_LENGTH = SPEC.pitch; // one stud: a full axle hole's depth

const spec: CalibrationSpec = {
  setting: "axle",
  feature: "section",
  ends: ["small end", "stop"],
  tabs: false,
  best: "the last section that goes into a genuine axle hole with light force and no play",
};

const axleCalibration: PartDefinition<CalibrationParams> = {
  id: "axle-calibration", // kept from the earlier calibration bar, so saved settings still apply
  name: "Calibration axle",
  clearance: [], // it sets its own axle sizes
  calibration: spec,
  params: [
    {
      key: "perSide",
      label: "Sections on each side of the middle section",
      type: "int",
      min: 1,
      max: 7,
      step: 1,
      default: 4,
    },
    { key: "step", label: "Size step (mm)", type: "number", min: 0.01, max: 0.2, default: 0.05 },
    centreParam("section", AXLE_SIZE_LIMIT),
  ],

  validate(params) {
    return rangeProblem(params, AXLE_SIZE_LIMIT, "sections");
  },

  info(params) {
    return calibrationInfo(params, spec) + " Each section is one stud long.";
  },

  filename: ({ perSide, centre }) => `axle-calibration-${2 * perSide + 1}-sections${centreSuffix(centre)}`,
};

export default axleCalibration;
