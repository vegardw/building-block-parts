import "./openCascade";
import { describe, it, expect } from "vitest";

import { requirePart, validatePart } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { holePositions } from "../src/parts/brickWithHoles";
import { NO_CLEARANCE, type Clearance } from "../src/spec";
import { analyseStep, stepGeometry } from "./stepStats";

// Expected values written out by hand (docs/dimensions.md, "Brick with holes"): a
// brick one stud wide (7.8), 9.6 tall, centred on z = 0, studs Ø4.85 × 1.8. The
// beam's hole across it, 5.8 above the bottom (z = 1.0): bore Ø4.8, counterbores
// Ø6.2 × 0.8 on both faces. Inside, walls 4.8 apart and a 7.2 wide boss round each
// hole, flat underneath 2.2 above the bottom (z = −2.6), Ø3.1 bars below them; a
// 1 × 1 is solid with a 2.2 deep room for a stud.
const part = requirePart("brick-with-holes");
const r3 = (n: number) => Number(n.toFixed(3));

async function geometryOf(length: number, clearance: Clearance = NO_CLEARANCE) {
  const step = await buildPart({ partId: "brick-with-holes", params: { length }, clearance }).blobSTEP().text();
  const g = stepGeometry(step);
  const along = (axis: 0 | 1 | 2) =>
    [...new Set(g.planes.filter((p) => Math.abs(p.normal[axis]) === 1).map((p) => r3(p.origin[axis])))].sort(
      (a, b) => a - b,
    );
  // Cylinders along an axis with a diameter: their positions across it, sorted.
  // (A bore can be split into several faces: each position is listed once.)
  const at = (axis: 1 | 2, d: number) =>
    [
      ...new Set(
        g.cylinders
          .filter((c) => Math.abs(c.axis[axis]) === 1 && r3(2 * c.radius) === r3(d))
          .map((c) => `${r3(c.origin[0])} ${r3(c.origin[axis === 1 ? 2 : 1])}`),
      ),
    ]
      .map((key) => key.split(" ").map(Number))
      .sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
  return { step, stats: analyseStep(step), xs: along(0), ys: along(1), zs: along(2), at };
}

const solids = (step: string) => (step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length;

describe("brick with holes parameters", () => {
  it("is 1 to 16 studs long and uses the hole, stud, underside, width and height settings", () => {
    expect(validatePart(part, { length: 4 })).toBeNull();
    expect(validatePart(part, { length: 1 })).toBeNull();
    expect(validatePart(part, { length: 16 })).toBeNull();
    expect(validatePart(part, { length: 17 })).toMatch(/Length \(studs\) must be/);
    expect(part.clearance).toEqual(["hole", "stud", "underside", "width", "height"]);
  });

  it("has a hole between each two studs, or under the stud of a 1 × 1", () => {
    expect(holePositions(1)).toEqual([0]);
    expect(holePositions(2)).toEqual([0]);
    expect(holePositions(4)).toEqual([-8, 0, 8]);
    expect(holePositions(16)).toHaveLength(15);
  });

  it("keeps the walls round the counterbores at 0.2 mm or more", () => {
    const c = (hole: number, height = 0) => ({ ...NO_CLEARANCE, hole, height });
    expect(validatePart(part, { length: 4 }, c(0.6))).toBeNull(); // boss wall (7.2 − 6.8) / 2 = 0.2, top 0.4
    expect(validatePart(part, { length: 4 }, c(0.61))).toMatch(/wall round the counterbore/);
    expect(validatePart(part, { length: 4 }, c(0.4, -0.2))).toBeNull(); // top: 9.4 − 5.8 − 3.3 = 0.3
    expect(validatePart(part, { length: 4 }, c(0.4, -0.31))).toMatch(/top above the counterbores/);
  });

  it("names the file and describes the part by its length", () => {
    expect(part.filename({ length: 4 })).toBe("brick-with-holes-1x4");
    expect(part.describe!({ length: 2 })).toBe("1 × 2");
    expect(part.info!({ length: 2 })).toMatch(
      /^15\.8 × 7\.8 mm, 9\.6 mm tall \(11\.4 mm with the studs\); 1 hole, 5\.8 mm up\./,
    );
  });

  it("shows the resulting sizes", () => {
    const c = { ...NO_CLEARANCE, hole: 0.2, underside: 0.1 };
    const tiles = Object.fromEntries(part.summary!({ length: 4 }, c).map((t) => [t.label, t.value]));
    expect(tiles).toMatchObject({
      "Hole ⌀": "5.00 mm",
      "Counterbore ⌀": "6.40 mm",
      "Bar ⌀": "3.00 mm",
      Inside: "4.90 mm",
    });
  });
});

describe("brick with holes STEP export", () => {
  it("1 × 4: three holes with counterbores, bosses and bars inside, walls that touch the studs", async () => {
    const g = await geometryOf(4);
    expect(solids(g.step)).toBe(1);
    expect(Object.keys(g.stats.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
    expect(Object.keys(g.stats.edgeTypes).sort()).toEqual(["CIRCLE", "LINE"]);
    const holes = [
      [-8, 1],
      [0, 1],
      [8, 1],
    ];
    expect(g.at(1, 4.8)).toEqual(holes); // bores, along Y, 5.8 above the bottom
    expect(g.at(1, 6.2)).toEqual(holes); // counterbores
    expect(g.at(1, 7.2)).toEqual([]); // the bosses are blocks...
    expect(g.xs).toEqual(expect.arrayContaining([-11.6, -4.4, -3.6, 3.6, 4.4, 11.6])); // ...7.2 wide
    expect(g.at(2, 3.1)).toEqual([
      [-8, 0],
      [0, 0],
      [8, 0],
    ]); // bars
    expect(g.at(2, 4.85)).toHaveLength(4); // studs
    expect(g.ys).toEqual([-3.9, -3.1, -2.4, 2.4, 3.1, 3.9]); // outside, counterbore floors, inside walls
    expect(g.xs).toEqual(expect.arrayContaining([-15.9, -14.4, 14.4, 15.9])); // outside, end walls
    // Underside, the bosses' flat bottoms, inside of the top, top, stud tops.
    expect(g.zs).toEqual([-4.8, -2.6, 3.8, 4.8, 6.6]);
  });

  it("1 × 1: solid round its hole, with a 4.8 square room 2.2 deep underneath", async () => {
    const g = await geometryOf(1);
    expect(solids(g.step)).toBe(1);
    expect(g.at(1, 4.8)).toEqual([[0, 1]]);
    expect(g.at(1, 6.2)).toEqual([[0, 1]]);
    expect(g.at(1, 7.2)).toEqual([]); // no boss: it is solid
    expect(g.xs).toEqual([-3.9, -2.4, 2.4, 3.9]);
    expect(g.zs).toEqual([-4.8, -2.6, 4.8, 6.6]);
  });

  it("applies the fit settings; the hole stays 5.8 above the bottom", async () => {
    const c = { ...NO_CLEARANCE, hole: 0.2, stud: 0.1, underside: 0.2, width: -0.2, height: 0.4 };
    const g = await geometryOf(2, c);
    expect(solids(g.step)).toBe(1);
    expect(g.at(1, 5)).toEqual([[0, 0.8]]); // bore 4.8 + 0.2; the bottom is at −5.0
    expect(g.at(1, 6.4)).toEqual([[0, 0.8]]);
    expect(g.at(2, 4.95)).toHaveLength(2);
    expect(g.at(2, 2.9)).toEqual([[0, 0]]); // bar 3.1 − 0.2
    expect(g.ys).toEqual([-3.8, -3, -2.5, 2.5, 3, 3.8]); // outside 7.6, counterbores 0.8 in, inside 5.0
    expect(g.zs).toEqual([-5, -2.8, 4, 5, 6.8]);
  });

  it.each([1, 2, 7, 16])("1 × %s at the setting limits: one solid, analytic", async (length) => {
    const c = { ...NO_CLEARANCE, hole: 0.6, stud: -0.5, underside: 0.5, width: -1, height: 1 };
    expect(validatePart(part, { length }, c)).toBeNull();
    const g = await geometryOf(length, c);
    expect(solids(g.step)).toBe(1);
    expect(Object.keys(g.stats.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
  });
});
