import { drawRectangle, makeBox, makeCylinder } from "replicad";
import type { Shape3D } from "replicad";
import { SPEC, BRICK, type Clearance } from "../spec";
import { holePositions, type BrickWithHolesParams } from "./brickWithHoles";
import { centres, undersideCutters } from "./brick.build";
import { as3D } from "./shapes";
import { cutAll, fuseAll } from "./booleans.build";

// Parameters are validated before this is called (see builders.ts).
// A brick one stud wide lying along X, its body centred on z = 0, studs up, the
// holes along Y. Three booleans whatever its length: the studs joined in one, the
// bosses taken out of the underside's cutter in one, and the underside and the holes
// cut in one. Taking the bosses out of the cutter, rather than adding them after,
// keeps them inside the brick whatever the fit settings.
export function buildBrickWithHoles({ length }: BrickWithHolesParams, clearance: Clearance): Shape3D {
  const { pitch, holeD, cboreD, cboreDepth } = SPEC;
  const long = length * pitch - BRICK.gap + clearance.width;
  const wide = pitch - BRICK.gap + clearance.width;
  const height = BRICK.brickHeight + clearance.height;
  const z0 = -height / 2;
  const zHole = z0 + BRICK.holeHeight;
  const embed = 0.5; // studs reach into the top so they fuse without coincident faces
  const over = 1; // cutters stick out so no faces are coincident

  const body = as3D(drawRectangle(long, wide).sketchOnPlane("XY", z0).extrude(height));
  const studs = centres(length).map((x) =>
    makeCylinder((BRICK.studD + clearance.stud) / 2, BRICK.studHeight + embed, [x, 0, z0 + height - embed], [0, 0, 1]),
  );

  // Along Y, through the brick, at a hole's position.
  const acrossAt = (x: number, r: number, from: number, to: number) =>
    makeCylinder(r, to - from, [x, from, zHole], [0, 1, 0]);
  const holes = holePositions(length);

  // A 1 × 1 is solid round its hole, with room underneath for the stud of the part
  // below, as deep as a plate's. Longer ones are hollow like a plain brick, less a
  // boss round each hole; the bars between the studs run up into the bosses. A
  // boss is a block as wide as a round one (BRICK.bossD), flat underneath at the
  // round one's lowest point: a round bar meeting a round boss across it would
  // leave an edge that is not a line, circle or ellipse. The studs of the part
  // below stay clear of it (1.8 against 2.2).
  let underside: Shape3D[];
  if (length === 1) {
    underside = undersideCutters(1, 1, 0, clearance.underside, z0, z0 + BRICK.plateHeight - BRICK.top);
  } else {
    const [cavity, ...others] = undersideCutters(1, length, 0, clearance.underside, z0, z0 + height - BRICK.top);
    if (!cavity) throw new Error("undersideCutters gave no cavity");
    const r = BRICK.bossD / 2;
    const bosses = holes.map((x) =>
      makeBox([x - r, -wide / 2 - over, zHole - r], [x + r, wide / 2 + over, z0 + height + over]),
    );
    underside = [cutAll([cavity, ...bosses]), ...others];
  }

  // The beam's hole: a bore through, a counterbore on each face, all with the hole setting.
  const bore = (holeD + clearance.hole) / 2;
  const cbore = (cboreD + clearance.hole) / 2;
  const holeCutters = holes.flatMap((x) => [
    acrossAt(x, bore, -wide / 2 - over, wide / 2 + over),
    acrossAt(x, cbore, -wide / 2 - over, -wide / 2 + cboreDepth),
    acrossAt(x, cbore, wide / 2 - cboreDepth, wide / 2 + over),
  ]);

  return cutAll([fuseAll([body, ...studs]), ...underside, ...holeCutters]);
}
