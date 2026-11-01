import type { Shape3D } from "replicad";
import { calibrationClearances, type CalibrationParams } from "./calibration";
import { SECTION_LENGTH } from "./axleCalibration";
import { axleAlongZ } from "./axle.build";
import { fuseAll } from "./booleans.build";

// Each section reaches this far into the next, larger one, which contains it
// completely, so neighbouring sections never meet in coincident faces.
const OVERLAP = 0.3;

// Parameters are validated before this is called (see builders.ts).
// Built along Z from the small end, centred on the nominal length, then laid along X.
export function buildAxleCalibration(params: CalibrationParams): Shape3D {
  const sizes = calibrationClearances(params);
  const total = sizes.length * SECTION_LENGTH;
  const sections = sizes.map((size, k) => {
    const first = k === 0;
    const last = k === sizes.length - 1;
    const length = SECTION_LENGTH + (last ? 0 : OVERLAP);
    // A normal bevelled end at the small end, the stop (collar size) at the large end.
    return axleAlongZ(length, first ? "plain" : "flush", last ? "stop" : "flush", size).translate(
      0,
      0,
      -total / 2 + k * SECTION_LENGTH + length / 2,
    );
  });
  const [smallest, ...rest] = sections;
  if (!smallest) throw new Error("A calibration axle needs at least one section.");
  // All the sections joined in one boolean, not one per section (see booleans.build.ts).
  return fuseAll([smallest, ...rest]).rotate(90, [0, 0, 0], [0, 1, 0]);
}
