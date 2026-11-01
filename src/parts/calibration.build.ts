import { draw, makeCylinder } from "replicad";
import type { Shape3D } from "replicad";
import { SPEC } from "../spec";
import { TAB, calibrationClearances, type CalibrationParams } from "./calibration";
import { as3D } from "./shapes";
import { cutAll, fuseAll } from "./booleans.build";

// Parameters are validated before this is called (see builders.ts).
export function buildCalibration(params: CalibrationParams): Shape3D {
  const { perSide } = params;
  const { pitch, height, holeD, cboreD, cboreDepth } = SPEC;
  const half = perSide * pitch; // distance from the middle hole to the end holes
  const over = 1; // cutters stick out so no faces are coincident
  const bar = calibrationBody(half, height);

  // Each hole: a through hole and a counterbore on each face, all cut in one
  // boolean, rather than one per hole (see booleans.build.ts).
  const cutterH = height + 2 * over;
  const cylinder = (r: number, h: number, x: number, z: number) => makeCylinder(r, h, [x, 0, z], [0, 0, 1]);
  const tools = calibrationClearances(params).flatMap((c, k) => {
    const x = (k - perSide) * pitch;
    return [
      cylinder((holeD + c) / 2, cutterH, x, -cutterH / 2),
      cylinder((cboreD + c) / 2, cboreDepth + over, x, -height / 2 - over),
      cylinder((cboreD + c) / 2, cboreDepth + over, x, height / 2 - cboreDepth),
    ];
  });
  return cutAll([bar, ...tools]);
}

// The body shared by the calibration bars, centred on z = 0: flat end on the
// negative side (smaller values), rounded end on the positive side, and
// tabs on both long sides marking the middle feature. `half` is the
// distance from the middle feature to the end features.
export function calibrationBody(half: number, height: number): Shape3D {
  const r = SPEC.width / 2;
  const x0 = -half - r; // flat end
  const run = 2 * half + r; // flat end to the centre of the rounded end
  const z0 = -height / 2;

  const bar: Shape3D = as3D(
    draw([x0, -r])
      .hLine(run)
      .tangentArc(0, 2 * r)
      .hLine(-run)
      .close()
      .sketchOnPlane("XY", z0)
      .extrude(height),
  );

  // Marker tabs beside the middle feature, on both long sides (they overlap the body by 0.5).
  const { width: tw, depth: td } = TAB;
  const tabTop = as3D(
    draw([-tw / 2, r - 0.5])
      .hLine(tw)
      .vLine(td + 0.5)
      .hLine(-tw)
      .close()
      .sketchOnPlane("XY", z0)
      .extrude(height),
  );
  const tabBottom = as3D(
    draw([-tw / 2, -r - td])
      .hLine(tw)
      .vLine(td + 0.5)
      .hLine(-tw)
      .close()
      .sketchOnPlane("XY", z0)
      .extrude(height),
  );
  return fuseAll([bar, tabTop, tabBottom]);
}
