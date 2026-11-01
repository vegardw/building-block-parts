import { draw, drawCircle, drawRectangle, makeCylinder } from "replicad";
import type { Shape3D } from "replicad";
import { SPEC, AXLE, type Clearance } from "../spec";
import { axleEnd, type AxleEnd, type AxleParams } from "./axle";
import { as3D } from "./shapes";
import { cutAll } from "./booleans.build";

// Parameters are validated before this is called (see builders.ts).
// Built along Z, then laid along X.
export function buildAxle({ length, endA, endB }: AxleParams, clearance: Clearance): Shape3D {
  const { axle: size, collar, stud } = clearance;
  return axleAlongZ(length * SPEC.pitch, axleEnd(endA).id, axleEnd(endB).id, size, collar, stud).rotate(
    90,
    [0, 0, 0],
    [0, 1, 0],
  );
}

// "flush": the cross runs straight to the nominal end, no inset or bevel; used
// where the axle is fused into something (a pin's collar, the next section of
// the calibration axle), not offered.
export type AxleEndId = AxleEnd["id"] | "flush";

// An axle along Z centred on z = 0, `nominal` mm long, with `size` added to the
// cross, `collar` to the stop flanges and `stud` to the stud: it sits in a brick's
// underside, so it takes the stud diameter, like a brick's studs.
export function axleAlongZ(
  nominal: number,
  endA: AxleEndId,
  endB: AxleEndId,
  size: number,
  collar = 0,
  stud = 0,
): Shape3D {
  const R = (AXLE.crossD + size) / 2; // tip radius
  const arm = (AXLE.armWidth + size) / 2; // half the arm width
  const ends = [
    { end: { id: endA }, at: -nominal / 2, dir: 1 }, // dir points into the axle
    { end: { id: endB }, at: nominal / 2, dir: -1 },
  ] as const;
  const bevelled = (id: AxleEndId) => id === "plain" || id === "notched" || id === "stop-in";
  const face = ({ end, at, dir }: (typeof ends)[number]) => at + (bevelled(end.id) ? dir * AXLE.endInset : 0);

  // A stop-in end's sleeve has the tip radius, so it is joined along the arm tips'
  // own cylinder. That comes out clean only with the cross made as it always was:
  // two rectangles fused and cut to a circle, the bevels cut one wedge at a time
  // (made any other way, it left slivers). Every other axle gets the quicker way,
  // which keeps less memory in the engine: a drawn outline, and each bevel cut in
  // one operation (see booleans.build.ts).
  const asBefore = endA === "stop-in" || endB === "stop-in";
  const profile = asBefore
    ? drawRectangle(2 * R + 2, 2 * arm)
        .fuse(drawRectangle(2 * arm, 2 * R + 2))
        .intersect(drawCircle(R))
    : crossOutline(R, arm);
  const z0 = face(ends[0]);
  let axle: Shape3D = as3D(profile.sketchOnPlane("XY", z0).extrude(face(ends[1]) - z0));
  const cut = (shape: Shape3D, tools: Shape3D[]) =>
    asBefore ? tools.reduce((s, tool) => s.cut(tool), shape) : cutAll([shape, ...tools]);

  // A cylinder between two positions along the axle.
  const segment = (r: number, a: number, b: number) =>
    makeCylinder(r, Math.abs(b - a), [0, 0, Math.min(a, b)], [0, 0, 1]);

  for (const e of ends) {
    const { end, at, dir } = e;
    const inward = (d: number) => at + dir * d; // position d mm in from the nominal end
    if (bevelled(end.id)) axle = cut(axle, bevelWedges(face(e), dir, R, (AXLE.bevelTipD + size) / 2));
    if (end.id === "notched") {
      // A ring around the floor; the core it leaves is longer than the ring on both sides.
      const [p, q] = [inward(AXLE.notchFrom), inward(AXLE.notchTo)];
      const [a, b] = [Math.min(p, q), Math.max(p, q)];
      const groove = segment(R + 1, a, b).cut(segment((AXLE.notchFloorD + size) / 2, a - 1, b + 1));
      axle = axle.cut(groove);
    }
    if (end.id === "stop" || end.id === "stud") {
      axle = axle.fuse(segment((SPEC.collarD + collar) / 2, at, inward(AXLE.stopThickness)));
    }
    if (end.id === "stud") {
      const top = inward(-AXLE.studHeight);
      const open = segment((AXLE.studD + stud) / 2, at, top).cut(segment(AXLE.studBoreD / 2, at, top - dir));
      axle = axle.fuse(open);
    }
    if (end.id === "stop-in") {
      const flangeOut = inward(SPEC.pitch - AXLE.stopThickness);
      const flangeIn = inward(SPEC.pitch);
      axle = axle
        .fuse(segment((AXLE.stopInD + collar) / 2, flangeOut, flangeIn))
        .fuse(segment(R, flangeIn, inward(SPEC.pitch + AXLE.sleeveLength)));
    }
  }
  return axle;
}

// The cross's outline, drawn as lines and arcs: arms `arm` either side of the
// axes, their tips arcs of the circle of radius R. The same shape as two
// rectangles fused and cut to that circle, without replicad's 2D booleans, which
// are slow and keep memory in the engine.
function crossOutline(R: number, arm: number) {
  const t = Math.sqrt(R * R - arm * arm); // where an arm's side meets the tip circle
  return draw([t, -arm])
    .threePointsArcTo([t, arm], [R, 0])
    .lineTo([arm, arm])
    .lineTo([arm, t])
    .threePointsArcTo([-arm, t], [0, R])
    .lineTo([-arm, arm])
    .lineTo([-t, arm])
    .threePointsArcTo([-t, -arm], [-R, 0])
    .lineTo([-arm, -arm])
    .lineTo([-arm, -t])
    .threePointsArcTo([arm, -t], [0, -R])
    .lineTo([arm, -arm])
    .close();
}

// The wedges that bevel the four arm tips at an end, one inclined plane per arm
// (flat facets, like the real part's), so the edges stay lines and ellipses.
function bevelWedges(faceZ: number, dir: number, R: number, tipR: number): Shape3D[] {
  const out = R + 1;
  const slope = (R - tipR) / AXLE.bevelLength; // radial per axial mm
  const over = 0.5; // start beyond the end face so no faces coincide
  // Triangle in the XZ plane for the +X arm, extruded across Y, then turned to arm k.
  // Its long side is the bevel plane: radius tipR at the end face, R one bevel length in.
  return [0, 1, 2, 3].map((k) =>
    as3D(
      draw([tipR - slope * over, faceZ - dir * over])
        .lineTo([out, faceZ - dir * over])
        .lineTo([out, faceZ + (dir * (out - tipR)) / slope])
        .close()
        .sketchOnPlane("XZ", [0, out, 0])
        .extrude(2 * out),
    ).rotate(90 * k, [0, 0, 0], [0, 0, 1]),
  );
}
