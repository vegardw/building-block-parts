import { draw } from "replicad";
import type { Shape3D } from "replicad";
import { SPEC, BRICK } from "../spec";
import { TAB, calibrationClearances, type CalibrationParams } from "./calibration";
import { SECTION_PITCH } from "./undersideCalibration";
import { undersideCutters } from "./brick.build";
import { as3D } from "./shapes";
import { cutAll } from "./booleans.build";

// Parameters are validated before this is called (see builders.ts).
// A plate two studs wide, centred on z = 0 and lying along X, its underside
// facing -Z as it is printed. Each 2 × 2 section is the underside of a 2 × 2
// plate as the generator makes it (brick.build.ts), at its own value.
// Neighbouring sections share a wall as thick as two plates' walls side by side.
// All sections are cut in one boolean (docs/architecture.md, "Memory").
export function buildUndersideCalibration(params: CalibrationParams): Shape3D {
  const { perSide } = params;
  const { plateHeight: height, top, gap } = BRICK;
  const w = (2 * SPEC.pitch - gap) / 2; // half the width: 7.9
  const z0 = -height / 2; // the underside
  const zTop = z0 + height - top; // the inside of the top

  const body = sectionsBody(perSide * SECTION_PITCH, w, height);
  const cutters = calibrationClearances(params).flatMap((c, k) =>
    undersideCutters(2, 2, (k - perSide) * SECTION_PITCH, c, z0, zTop),
  );
  return cutAll([body, ...cutters]);
}

// The solid outline, centred on z = 0: flat end on the negative side (smaller
// values), a rounded end beyond the last section, and tabs on both long sides
// marking the middle section, drawn as one outline. `half` is the distance from
// the middle section's centre to the end sections' centres.
function sectionsBody(half: number, w: number, height: number): Shape3D {
  const end = half + w; // the end sections' outer faces
  const { width: tw, depth: td } = TAB;
  return as3D(
    draw([-end, -w])
      .hLine(end - tw / 2)
      .vLine(-td)
      .hLine(tw)
      .vLine(td)
      .hLine(end - tw / 2)
      .tangentArc(0, 2 * w)
      .hLine(-(end - tw / 2))
      .vLine(td)
      .hLine(-tw)
      .vLine(-td)
      .hLine(-(end - tw / 2))
      .close()
      .sketchOnPlane("XY", -height / 2)
      .extrude(height),
  );
}
