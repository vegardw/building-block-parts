// Measures a beam-like part (holes along X, hole axes along Z) from its STEP
// geometry, independent of where the model sits. Used by the dimension tests.
import type { StepGeometry } from "./stepStats";
import { NO_CLEARANCE, type Clearance } from "../src/spec";

const r3 = (n: number) => Number(n.toFixed(3)); // compare to 0.001 mm
const unique = (values: number[]) => [...new Set(values.map(r3))].sort((a, b) => a - b);
const isAxis = (v: number[], i: number) => Math.abs(Math.abs(v[i] ?? 0) - 1) < 1e-9;
// The first and last of sorted values (smallest and largest).
const ends = (values: number[], what: string): [number, number] => {
  const [first, last] = [values[0], values[values.length - 1]];
  if (first === undefined || last === undefined) throw new Error(`no ${what} found`);
  return [first, last];
};

export interface BeamMeasurements {
  width: number; // across the flat sides (Y)
  height: number; // along the holes (Z)
  length: number; // over the rounded ends (X)
  endRadius: number;
  holeD: number;
  cboreD: number;
  cboreDepths: number[]; // distinct counterbore depths, measured from each face
  holeX: number[]; // hole centres, sorted
  cboreCount: number;
  centre: [number, number, number]; // middle of the holes in X, of the sides in Y, of the faces in Z
  holeAxesAlongZ: boolean; // every cylinder is parallel to Z and on the beam's centre line
}

export function measureBeam(g: StepGeometry): BeamMeasurements {
  const ys = unique(g.planes.filter((p) => isAxis(p.normal, 1)).map((p) => p.origin[1]));
  const zs = unique(g.planes.filter((p) => isAxis(p.normal, 2)).map((p) => p.origin[2]));
  const [bottom, top] = ends(zs, "faces along Z");
  const floors = zs.filter((z) => z !== bottom && z !== top);

  // Bore < counterbore < rounded end: the wall check keeps the counterbore inside the width.
  const radii = unique(g.cylinders.map((c) => c.radius));
  if (radii.length !== 3) throw new Error(`expected 3 cylinder radii, got ${radii.join(", ")}`);
  const [boreR, cboreR, endR] = radii as [number, number, number];
  const xsOf = (r: number) =>
    g.cylinders
      .filter((c) => r3(c.radius) === r)
      .map((c) => r3(c.origin[0]))
      .sort((a, b) => a - b);
  const holeX = xsOf(boreR);
  const [firstHole, lastHole] = ends(holeX, "holes");
  const [firstEnd, lastEnd] = ends(xsOf(endR), "rounded ends");
  const [minY, maxY] = ends(ys, "sides");
  const midY = (minY + maxY) / 2;

  return {
    width: r3(maxY - minY),
    height: r3(top - bottom),
    length: r3(lastEnd + endR - (firstEnd - endR)),
    endRadius: endR,
    holeD: r3(2 * boreR),
    cboreD: r3(2 * cboreR),
    cboreDepths: unique(floors.map((z) => (z > (top + bottom) / 2 ? top - z : z - bottom))),
    holeX,
    cboreCount: xsOf(cboreR).length,
    centre: [r3((firstHole + lastHole) / 2), r3(midY), r3((top + bottom) / 2)],
    holeAxesAlongZ: g.cylinders.every((c) => isAxis(c.axis, 2) && r3(c.origin[1]) === r3(midY)),
  };
}

// Distances between neighbouring hole centres.
export const gaps = (xs: number[]) => xs.slice(1).map((x, i) => r3(x - xs[i]!));

// Expected values are written out here rather than taken from SPEC, so a wrong
// constant can't make the test agree with itself. Sources: docs/dimensions.md.
export const NOMINAL = { pitch: 8, width: 7.2, height: 8, holeD: 4.8, cboreD: 6.2, cboreDepth: 0.8 };
// The beam's height choice (its `height` parameter) and the nominal height it
// gives: the half-height beam has the same holes, half the height.
export const BEAM_HEIGHTS: Record<string, { height: number; nominal: number }> = {
  full: { height: 0, nominal: 8 },
  half: { height: 1, nominal: 4 },
};

export function expectedBeam(holes: number, c: Clearance = NO_CLEARANCE, nominalHeight = NOMINAL.height) {
  const width = NOMINAL.width + c.width;
  const r = (n: number) => Number(n.toFixed(3)); // the same rounding as the measurements
  return {
    width: r(width),
    height: r(nominalHeight + c.height),
    length: r((holes - 1) * NOMINAL.pitch + width),
    endRadius: r(width / 2),
    holeD: r(NOMINAL.holeD + c.hole),
    cboreD: r(NOMINAL.cboreD + c.hole),
    cboreDepths: [NOMINAL.cboreDepth], // clearance never changes the depth
  };
}
