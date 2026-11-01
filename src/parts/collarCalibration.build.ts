import { makeCylinder } from "replicad";
import type { Shape3D } from "replicad";
import { SPEC } from "../spec";
import { calibrationClearances, type CalibrationParams } from "./calibration";
import { BUTTON_PITCH, BUTTON_HEIGHT } from "./collarCalibration";
import { calibrationBody } from "./calibration.build";
import { fuseAll } from "./booleans.build";

// Parameters are validated before this is called (see builders.ts).
export function buildCollarCalibration(params: CalibrationParams): Shape3D {
  const { perSide } = params;
  const height = SPEC.halfHeight; // the bar only carries the buttons
  const embed = 1; // buttons reach into the bar so they fuse without coincident faces
  const bar = calibrationBody(perSide * BUTTON_PITCH, height);

  // All the buttons joined to the bar in one boolean (see booleans.build.ts).
  const buttons = calibrationClearances(params).map((c, k) =>
    makeCylinder(
      (SPEC.collarD + c) / 2,
      BUTTON_HEIGHT + embed,
      [(k - perSide) * BUTTON_PITCH, 0, height / 2 - embed],
      [0, 0, 1],
    ),
  );
  return fuseAll([bar, ...buttons]);
}
