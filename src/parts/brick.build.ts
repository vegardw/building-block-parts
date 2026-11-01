import {
  Vector,
  addHolesInFace,
  assembleWire,
  basicFaceExtrusion,
  drawRectangle,
  makeCircle,
  makeCylinder,
  makePolygon,
} from "replicad";
import type { Shape3D } from "replicad";
import { SPEC, BRICK, type Clearance } from "../spec";
import { studsOf, type BrickParams } from "./brick";
import { as3D } from "./shapes";
import { cutAll, fuseAll } from "./booleans.build";

// Parameters are validated before this is called (see builders.ts).
export const buildBrick = (params: BrickParams, clearance: Clearance): Shape3D =>
  buildStudded(params, clearance, BRICK.brickHeight);
export const buildPlate = (params: BrickParams, clearance: Clearance): Shape3D =>
  buildStudded(params, clearance, BRICK.plateHeight);

// A brick or plate lying along X, its body centred on z = 0, studs up. Two
// booleans whatever its size: the studs joined in one, the underside cut in one.
function buildStudded(params: BrickParams, clearance: Clearance, nominalHeight: number): Shape3D {
  const { across, along } = studsOf(params);
  const { pitch } = SPEC;
  const outside = (studs: number) => studs * pitch - BRICK.gap + clearance.width;
  const height = nominalHeight + clearance.height;
  const z0 = -height / 2;
  const embed = 0.5; // studs reach into the top so they fuse without coincident faces

  const body = as3D(drawRectangle(outside(along), outside(across)).sketchOnPlane("XY", z0).extrude(height));
  const studs = centres(along).flatMap((x) =>
    centres(across).map((y) =>
      makeCylinder(
        (BRICK.studD + clearance.stud) / 2,
        BRICK.studHeight + embed,
        [x, y, z0 + height - embed],
        [0, 0, 1],
      ),
    ),
  );
  const zTop = z0 + height - BRICK.top;
  return cutAll([fuseAll([body, ...studs]), ...undersideCutters(across, along, 0, clearance.underside, z0, zTop)]);
}

// Positions of n studs, `pitch` apart, centred on 0.
export const centres = (n: number) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * SPEC.pitch);

// The cutters that hollow out the underside of a part `across` × `along` studs
// (across ≤ along), centred on (x, 0), from below `z0` (the underside) up to `zTop`
// (the inside of the top): the inside, drawn with the ribs, tubes and bars left
// out and extruded, and the tubes' bores. Cut in one boolean with others, this
// keeps far less engine memory than fusing the ribs and tubes on (docs/architecture.md,
// "Memory"). `value` is the underside setting: every surface that touches a stud
// moves away from it by half of it, so tubes and bars shrink by the value.
export function undersideCutters(
  across: number,
  along: number,
  x: number,
  value: number,
  z0: number,
  zTop: number,
): Shape3D[] {
  const { pitch } = SPEC;
  const { gap, wall, ribWidth, socketD, tubeD, tubeBoreD, barD } = BRICK;
  const over = 1; // the cutters reach below the underside so no faces are coincident
  const zc = z0 - over;
  // From the centre to the side of the outermost stud it is made for, along each axis.
  const reach = (studs: number) => ((studs - 1) * pitch + socketD + value) / 2;
  // Between the studs: tubes (two studs wide or more) or bars (one stud wide).
  const between = (n: number) => centres(n - 1);

  let outline: [number, number][];
  const holes: { at: [number, number]; d: number }[] = [];
  if (across === 1) {
    // Flat walls that touch the studs (4.8 inside), bars between them.
    outline = insideOutline(reach(along), reach(1), [], [], 0, 0, 0);
    for (const bx of between(along)) holes.push({ at: [bx, 0], d: barD - value });
  } else {
    // 1.2 walls with a rib at each stud row and column, reaching the studs; tubes.
    const inside = (studs: number) => (studs * pitch - gap) / 2 - wall;
    outline = insideOutline(
      inside(along),
      inside(across),
      centres(along),
      centres(across),
      reach(along),
      reach(across),
      ribWidth / 2,
    );
    for (const tx of between(along)) for (const ty of between(across)) holes.push({ at: [tx, ty], d: tubeD - value });
  }

  const points = outline.map(([u, v]): [number, number, number] => [x + u, v, zc]);
  const wires = holes.map(({ at: [u, v], d }) => assembleWire([makeCircle(d / 2, [x + u, v, zc], [0, 0, 1])]));
  const face = wires.length > 0 ? addHolesInFace(makePolygon(points), wires) : makePolygon(points);
  const cavity = basicFaceExtrusion(face, new Vector([0, 0, zTop - zc]));
  const bores =
    across === 1
      ? []
      : holes.map(({ at: [u, v] }) => makeCylinder(tubeBoreD / 2, zTop - zc, [x + u, v, zc], [0, 0, 1]));
  return [cavity, ...bores];
}

// An underside's inside seen from below, centred, counter-clockwise: a rectangle
// `halfX` by `halfY` from the centre, with a notch for a rib at each of `ribsX`
// (on the long walls, reaching to `ribY` from the centre) and each of `ribsY` (on
// the end walls, reaching to `ribX`), `halfRib` wide each way.
function insideOutline(
  halfX: number,
  halfY: number,
  ribsX: number[],
  ribsY: number[],
  ribX: number,
  ribY: number,
  halfRib: number,
): [number, number][] {
  const h = halfRib;
  const points: [number, number][] = [[-halfX, -halfY]];
  for (const u of ribsX) points.push([u - h, -halfY], [u - h, -ribY], [u + h, -ribY], [u + h, -halfY]);
  points.push([halfX, -halfY]);
  for (const v of ribsY) points.push([halfX, v - h], [ribX, v - h], [ribX, v + h], [halfX, v + h]);
  points.push([halfX, halfY]);
  for (const u of [...ribsX].reverse()) points.push([u + h, halfY], [u + h, ribY], [u - h, ribY], [u - h, halfY]);
  points.push([-halfX, halfY]);
  for (const v of [...ribsY].reverse()) points.push([-halfX, v + h], [-ribX, v + h], [-ribX, v - h], [-halfX, v - h]);
  return points;
}
