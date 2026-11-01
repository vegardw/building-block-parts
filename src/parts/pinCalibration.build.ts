import { makeCylinder } from "replicad";
import type { Shape3D } from "replicad";
import { SPEC, PIN } from "../spec";
import { calibrationClearances, type CalibrationParams } from "./calibration";
import { STUB_PITCH, STUB_LENGTH } from "./pinCalibration";
import { calibrationBody } from "./calibration.build";
import { fuseAll } from "./booleans.build";

// Parameters are validated before this is called (see builders.ts).
export function buildPinCalibration(params: CalibrationParams): Shape3D {
  const { perSide } = params;
  const height = SPEC.halfHeight; // the bar only carries the stubs
  const embed = 1; // stubs reach into the bar so they fuse without coincident faces
  const bar = calibrationBody(perSide * STUB_PITCH, height);

  // All the stubs joined to the bar in one boolean (see booleans.build.ts).
  const stubs = calibrationClearances(params).map((c, k) =>
    // Plain round stubs: the shaft diameter is what decides how a pin turns.
    makeCylinder(
      (PIN.shaftD + c) / 2,
      STUB_LENGTH + embed,
      [(k - perSide) * STUB_PITCH, 0, height / 2 - embed],
      [0, 0, 1],
    ),
  );
  return fuseAll([bar, ...stubs]);
}
