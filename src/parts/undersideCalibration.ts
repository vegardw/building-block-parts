// Underside calibration bar: a plate two studs wide whose underside is divided
// into 2 × 2 sections, each the underside of a 2 × 2 plate (a tube and the walls
// around it) made for a different stud size. Pressing each section onto a genuine
// 2 × 2 shows which grips like a genuine part. Same layout as the other
// calibration bars: the middle section has the middle value, smaller (tighter)
// towards the flat end, larger (looser) towards the rounded end, tabs beside the middle.
import { SPEC, UNDERSIDE_SIZE_LIMIT } from "../spec";
import { calibrationInfo, centreParam, centreSuffix, rangeProblem, type CalibrationParams } from "./calibration";
import type { CalibrationSpec, PartDefinition } from "./types";

// A section is two studs long, so a genuine 2 × 2 pressed into one reaches no other.
export const SECTION_PITCH = 2 * SPEC.pitch;

const spec: CalibrationSpec = {
  setting: "underside",
  feature: "section",
  ends: ["flat end", "rounded end"],
  tabs: true,
  best: "the section that holds on a genuine 2 × 2 plate most like a genuine 2 × 2 does (of two that are close, the larger)",
};

const undersideCalibration: PartDefinition<CalibrationParams> = {
  id: "underside-calibration",
  name: "Underside calibration bar",
  clearance: [], // it sets its own underside sizes
  calibration: spec,
  view: "below", // printed underside down, like a brick: the sections face down
  params: [
    {
      key: "perSide",
      label: "Sections on each side of the middle section",
      type: "int",
      min: 1,
      max: 7,
      step: 1,
      // Seven sections are 120 mm long, which fits a typical resin plate; nine would be 152 mm.
      default: 3,
    },
    { key: "step", label: "Size step (mm)", type: "number", min: 0.01, max: 0.2, default: 0.05 },
    centreParam("section", UNDERSIDE_SIZE_LIMIT),
  ],

  validate(params) {
    return rangeProblem(params, UNDERSIDE_SIZE_LIMIT, "sections");
  },

  info(params) {
    return calibrationInfo(params, spec);
  },

  filename: ({ perSide, centre }) => `underside-calibration-${2 * perSide + 1}-sections${centreSuffix(centre)}`,
};

export default undersideCalibration;
