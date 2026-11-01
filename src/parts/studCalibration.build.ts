import { makeCylinder } from "replicad";
import type { Shape3D } from "replicad";
import { BRICK } from "../spec";
import { calibrationClearances, type CalibrationParams } from "./calibration";
import { STUD_PITCH } from "./studCalibration";
import { calibrationBody } from "./calibration.build";
import { fuseAll } from "./booleans.build";

// Parameters are validated before this is called (see builders.ts).
export function buildStudCalibration(params: CalibrationParams): Shape3D {
  const { perSide } = params;
  const height = BRICK.plateHeight; // a plate, studs up, printed like a brick
  const embed = 1; // studs reach into the bar so they fuse without coincident faces
  const bar = calibrationBody(perSide * STUD_PITCH, height);

  // All the studs joined to the bar in one boolean (see booleans.build.ts).
  const studs = calibrationClearances(params).map((c, k) =>
    makeCylinder(
      (BRICK.studD + c) / 2,
      BRICK.studHeight + embed,
      [(k - perSide) * STUD_PITCH, 0, height / 2 - embed],
      [0, 0, 1],
    ),
  );
  return fuseAll([bar, ...studs]);
}
