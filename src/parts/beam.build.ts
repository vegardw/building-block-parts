import { draw, makeCompound, makeCylinder } from "replicad";
import type { Shape3D } from "replicad";
import { SPEC, type Clearance } from "../spec";
import { beamDimensions, nominalHeight, type BeamParams } from "./beam";
import { as3D } from "./shapes";

// Parameters are validated before this is called (see builders.ts).
export function buildBeam({ holes, height: heightChoice }: BeamParams, clearance: Clearance): Shape3D {
  const { pitch, cboreDepth } = SPEC;
  const { width, height, holeD, cboreD } = beamDimensions(clearance, nominalHeight(heightChoice));
  const half = ((holes - 1) * pitch) / 2;
  const over = 1; // cutters stick out so no faces are coincident

  // Stadium profile, centred on the origin
  const body = as3D(
    draw([-half, -width / 2])
      .hLine(2 * half)
      .tangentArc(0, width)
      .hLine(-2 * half)
      .tangentArc(0, -width)
      .close()
      .sketchOnPlane("XY", -height / 2)
      .extrude(height),
  );

  // One hole cutter: through hole + counterbore on each face
  const cutterH = height + 2 * over;
  const cutter = makeCylinder(holeD / 2, cutterH)
    .translateZ(-cutterH / 2)
    .fuse(makeCylinder(cboreD / 2, cboreDepth + over).translateZ(-height / 2 - over))
    .fuse(makeCylinder(cboreD / 2, cboreDepth + over).translateZ(height / 2 - cboreDepth));

  // All the holes in one cut, with a compound of cutters: one boolean instead of
  // one per hole is about 4 times faster for 32 holes and doesn't grow the
  // engine's memory (docs/architecture.md, "Memory"). The result is the same solid.
  const cutters = Array.from({ length: holes }, (_, i) => cutter.clone().translateX(-half + i * pitch));
  return body.cut(as3D(makeCompound(cutters)));
}
