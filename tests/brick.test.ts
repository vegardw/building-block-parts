import "./openCascade";
import { describe, it, expect } from "vitest";

import { requirePart, validatePart } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { NO_CLEARANCE, type Clearance } from "../src/spec";
import { analyseStep, stepGeometry } from "./stepStats";

// Expected values written out by hand (docs/dimensions.md, "Brick and plate"):
// n studs are n × 8 − 0.2 long; the body is centred on z = 0 with a 1.0 top;
// studs Ø4.85 × 1.8. Two studs wide or more: 1.2 walls with a rib at each stud
// reaching a 4.8 stud (2.4 beyond the stud's centre), tubes 8√2 − 4.8 = 6.514
// across with a Ø4.8 bore between each four studs. One stud wide: walls 4.8 apart
// and Ø3.1 bars between the studs.
const brick = requirePart("brick");
const plate = requirePart("plate");
const r3 = (n: number) => Number(n.toFixed(3));
const TUBE = 8 * Math.SQRT2 - 4.8;

async function geometryOf(partId: string, width: number, length: number, clearance: Clearance = NO_CLEARANCE) {
  const step = await buildPart({ partId, params: { width, length }, clearance }).blobSTEP().text();
  const g = stepGeometry(step);
  const along = (axis: 0 | 1 | 2) =>
    [...new Set(g.planes.filter((p) => Math.abs(p.normal[axis]) === 1).map((p) => r3(p.origin[axis])))].sort(
      (a, b) => a - b,
    );
  const zCylinders = g.cylinders.filter((c) => Math.abs(c.axis[2]) === 1);
  const at = (d: number) =>
    zCylinders
      .filter((c) => r3(2 * c.radius) === r3(d))
      .map((c) => [r3(c.origin[0]), r3(c.origin[1])])
      .sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
  return { step, stats: analyseStep(step), xs: along(0), ys: along(1), zs: along(2), at, zCylinders };
}

const solids = (step: string) => (step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length;

describe("brick and plate parameters", () => {
  it("default to a 2 × 4 and use the stud, underside, width and height settings", () => {
    for (const part of [brick, plate]) {
      expect(validatePart(part, { width: 2, length: 4 })).toBeNull();
      expect(part.clearance).toEqual(["stud", "underside", "width", "height"]);
    }
  });

  it("allow 1 to 16 studs across and 1 to 32 along", () => {
    expect(validatePart(brick, { width: 1, length: 1 })).toBeNull();
    expect(validatePart(plate, { width: 16, length: 32 })).toBeNull();
    expect(validatePart(brick, { width: 17, length: 32 })).toMatch(/Width \(studs\) must be/);
    expect(validatePart(brick, { width: 2, length: 33 })).toMatch(/Length \(studs\) must be/);
    expect(validatePart(brick, { width: 1.5, length: 4 })).toMatch(/Width \(studs\)/);
  });

  it("name a part the same whichever way round its size is given", () => {
    expect(brick.filename({ width: 2, length: 4 })).toBe("brick-2x4");
    expect(brick.filename({ width: 4, length: 2 })).toBe("brick-2x4");
    expect(plate.filename({ width: 1, length: 6 })).toBe("plate-1x6");
    expect(brick.describe!({ width: 4, length: 2 })).toBe("2 × 4");
  });

  it("offer quick picks that are valid sizes", () => {
    for (const part of [brick, plate]) {
      for (const p of part.presets!.options)
        expect(validatePart(part, { width: 2, length: 4, ...p.params })).toBeNull();
    }
  });

  it("note the size, and on a plate how plates stack", () => {
    expect(brick.info!({ width: 2, length: 4 })).toBe("31.8 × 15.8 mm, 9.6 mm tall (11.4 mm with the studs).");
    expect(plate.info!({ width: 1, length: 2 })).toMatch(
      /^15\.8 × 7\.8 mm, 3\.2 mm tall \(5\.0 mm with the studs\)\. Three plates/,
    );
  });

  it("show the resulting sizes: tubes when two studs wide, bars and the inside when one", () => {
    const c = { ...NO_CLEARANCE, stud: 0.05, underside: 0.1, width: -0.1, height: 0.2 };
    const tiles = (w: number, l: number) =>
      Object.fromEntries(brick.summary!({ width: w, length: l }, c).map((t) => [t.label, t.value]));
    expect(tiles(2, 4)).toEqual({
      Length: "31.70 mm",
      Width: "15.70 mm",
      Height: "9.80 mm",
      "Stud ⌀": "4.90 mm",
      "Tube ⌀": `${(TUBE - 0.1).toFixed(2)} mm`,
    });
    expect(tiles(1, 4)).toEqual({
      Length: "31.70 mm",
      Width: "7.70 mm",
      Height: "9.80 mm",
      "Stud ⌀": "4.90 mm",
      "Bar ⌀": "3.00 mm",
      Inside: "4.90 mm",
    });
    expect(
      Object.keys(Object.fromEntries(brick.summary!({ width: 1, length: 1 }, c).map((t) => [t.label, 1]))),
    ).not.toContain("Bar ⌀");
  });
});

describe("brick and plate STEP export", () => {
  it("2 × 4 brick: outside, studs, ribbed walls and three tubes", async () => {
    const g = await geometryOf("brick", 2, 4);
    expect(solids(g.step)).toBe(1);
    expect(Object.keys(g.stats.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
    expect(Object.keys(g.stats.edgeTypes).sort()).toEqual(["CIRCLE", "LINE"]);
    // Outside ±15.9 × ±7.9; inside the walls ±14.7 × ±6.7; rib faces ±14.4 (ends) and
    // ±6.4 (sides); the ribs' sides 0.3 either side of each stud row and column.
    expect(g.xs).toEqual([-15.9, -14.7, -14.4, -12.3, -11.7, -4.3, -3.7, 3.7, 4.3, 11.7, 12.3, 14.4, 14.7, 15.9]);
    expect(g.ys).toEqual([-7.9, -6.7, -6.4, -4.3, -3.7, 3.7, 4.3, 6.4, 6.7, 7.9]);
    expect(g.zs).toEqual([-4.8, 3.8, 4.8, 6.6]); // underside, inside of the top, top, stud tops
    expect(g.at(4.85)).toEqual([
      [-12, -4],
      [-12, 4],
      [-4, -4],
      [-4, 4],
      [4, -4],
      [4, 4],
      [12, -4],
      [12, 4],
    ]);
    expect(g.at(TUBE)).toEqual([
      [-8, 0],
      [0, 0],
      [8, 0],
    ]);
    expect(g.at(4.8)).toEqual([
      [-8, 0],
      [0, 0],
      [8, 0],
    ]); // the tubes' bores
  });

  it("1 × 4 brick: walls that touch the studs and three bars, no tubes or ribs", async () => {
    const g = await geometryOf("brick", 1, 4);
    expect(solids(g.step)).toBe(1);
    expect(g.xs).toEqual([-15.9, -14.4, 14.4, 15.9]); // the end walls touch the end studs too
    expect(g.ys).toEqual([-3.9, -2.4, 2.4, 3.9]); // 4.8 inside: 1.5 walls
    expect(g.at(4.85)).toEqual([
      [-12, 0],
      [-4, 0],
      [4, 0],
      [12, 0],
    ]);
    expect(g.at(3.1)).toEqual([
      [-8, 0],
      [0, 0],
      [8, 0],
    ]);
    expect(g.at(TUBE)).toEqual([]);
  });

  it("1 × 1 plate: a 4.8 square inside, a 2.2 deep underside", async () => {
    const g = await geometryOf("plate", 1, 1);
    expect(solids(g.step)).toBe(1);
    expect(g.xs).toEqual([-3.9, -2.4, 2.4, 3.9]);
    expect(g.ys).toEqual([-3.9, -2.4, 2.4, 3.9]);
    expect(g.zs).toEqual([-1.6, 0.6, 1.6, 3.4]);
    expect(g.at(4.85)).toEqual([[0, 0]]);
  });

  it("4 × 4 plate: nine tubes, ribs on all four walls", async () => {
    const g = await geometryOf("plate", 4, 4);
    expect(solids(g.step)).toBe(1);
    expect(g.at(TUBE)).toHaveLength(9);
    expect(g.at(4.85)).toHaveLength(16);
    expect(g.xs).toContain(-14.4);
    expect(g.ys).toContain(14.4);
  });

  it("applies the fit settings: studs, underside, outside and height", async () => {
    const c = { ...NO_CLEARANCE, stud: 0.1, underside: 0.2, width: -0.2, height: 0.4 };
    const g = await geometryOf("brick", 2, 4, c);
    expect(g.at(4.95)).toHaveLength(8);
    expect(g.at(TUBE - 0.2)).toHaveLength(3);
    expect(g.xs).toEqual(expect.arrayContaining([-15.8, -14.5, 14.5, 15.8])); // outside, end-wall ribs
    expect(g.ys).toEqual(expect.arrayContaining([-7.8, -6.5, 6.5, 7.8])); // outside, side-wall ribs
    expect(g.zs).toEqual([-5, 4, 5, 6.8]);
    const one = await geometryOf("brick", 1, 2, c);
    expect(one.ys).toEqual([-3.8, -2.5, 2.5, 3.8]); // 5.0 inside
    expect(one.at(2.9)).toEqual([[0, 0]]); // the bar
  });

  it("builds a 4 × 2 as a 2 × 4, along X", async () => {
    const g = await geometryOf("plate", 4, 2);
    expect(g.xs[0]).toBe(-15.9);
    expect(g.ys[0]).toBe(-7.9);
  });

  it.each([
    ["brick", 1, 16],
    ["plate", 3, 5],
    ["brick", 2, 2],
  ])("%s %s × %s: one solid, analytic", async (partId, width, length) => {
    const g = await geometryOf(partId, width, length, {
      ...NO_CLEARANCE,
      underside: 0.5,
      stud: -0.5,
      width: -1,
      height: -1,
    });
    expect(solids(g.step)).toBe(1);
    expect(Object.keys(g.stats.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
  });
});
