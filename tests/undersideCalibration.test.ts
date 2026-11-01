import "./openCascade";
import { describe, it, expect } from "vitest";

import { requirePart, validatePart } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { calibrationClearances, type CalibrationParams } from "../src/parts/calibration";
import { NO_CLEARANCE } from "../src/spec";
import { analyseStep, stepGeometry } from "./stepStats";

// Expected values written out by hand. A plate 15.8 wide and 3.2 thick, centred on
// z = 0, its underside at z = -1.6 and a 1.0 top (inside at z = 0.6). Sections 16 mm
// apart, each 13.4 square inside (1.2 walls; 2.6 between sections). A nominal stud's
// side is 6.4 from a section's centre (4 + 2.4): there the ribs end, moved out by half
// the section's value. The tube touches four nominal studs: 8√2 − 4.8 = 6.514 across,
// less the value, with a Ø4.8 bore.
const part = requirePart("underside-calibration");
const defaults: CalibrationParams = { perSide: 3, step: 0.05, centre: 0 };
const r3 = (n: number) => Number(n.toFixed(3));
const TUBE = 8 * Math.SQRT2 - 4.8;

describe("underside calibration bar parameters", () => {
  it("defaults give seven sections, -0.15 .. +0.15 mm in 0.05 mm steps, uses no global clearance", () => {
    expect(validatePart(part, defaults)).toBeNull();
    expect(calibrationClearances(defaults)).toEqual([-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15]);
    expect(part.clearance).toEqual([]);
    expect(part.view).toBe("below");
    expect(part.filename(defaults)).toBe("underside-calibration-7-sections");
  });

  it("allows sizes up to the ±0.5 mm underside limit", () => {
    expect(validatePart(part, { perSide: 5, step: 0.1, centre: 0 })).toBeNull(); // exactly 0.5
    expect(validatePart(part, { perSide: 6, step: 0.1, centre: 0 })).toMatch(/beyond the limit/);
  });
});

describe("underside calibration bar STEP export", () => {
  it.each([
    defaults,
    { perSide: 5, step: 0.1, centre: 0 }, // the limits: ribs 0.05 and 0.55 deep
    { perSide: 1, step: 0.01, centre: 0 },
    { perSide: 2, step: 0.1, centre: 0.25 },
  ])("%j: one solid; each section's tube and ribs at its value", async (params) => {
    const step = await buildPart({ partId: "underside-calibration", params, clearance: NO_CLEARANCE })
      .blobSTEP()
      .text();
    const stats = analyseStep(step);
    const g = stepGeometry(step);
    expect((step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length).toBe(1);
    expect(Object.keys(stats.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
    expect(Object.keys(stats.edgeTypes).sort()).toEqual(["CIRCLE", "LINE"]);

    const zCylinders = g.cylinders.filter((c) => Math.abs(c.axis[2]) === 1);
    const yPlanes = new Set(g.planes.filter((p) => Math.abs(p.normal[1]) === 1).map((p) => r3(p.origin[1])));
    const xPlanes = new Set(g.planes.filter((p) => Math.abs(p.normal[0]) === 1).map((p) => r3(p.origin[0])));
    calibrationClearances(params).forEach((c, k) => {
      const x = (k - params.perSide) * 16;
      const radii = zCylinders.filter((cyl) => r3(cyl.origin[0]) === r3(x) && r3(cyl.origin[1]) === 0);
      expect(radii.map((cyl) => r3(2 * cyl.radius)).sort(), `section ${c}`).toEqual([4.8, r3(TUBE - c)]);
      const rib = 6.4 + c / 2;
      for (const y of [-rib, rib]) expect(yPlanes.has(r3(y)), `long-wall rib ${c} at y ${y}`).toBe(true);
      for (const dx of [-rib, rib]) expect(xPlanes.has(r3(x + dx)), `cross-wall rib ${c} at x ${x + dx}`).toBe(true);
    });

    // Inside walls at ±6.7, outside at ±7.9 and the tabs at ±8.7.
    for (const y of [6.7, 7.9, 8.7]) expect([yPlanes.has(y), yPlanes.has(-y)]).toEqual([true, true]);
    const zs = new Set(g.planes.filter((p) => Math.abs(p.normal[2]) === 1).map((p) => r3(p.origin[2])));
    expect([...zs].sort((a, b) => a - b)).toEqual([-1.6, 0.6, 1.6]);
    // The flat end, and the rounded end (radius 7.9) beyond the last section.
    const end = params.perSide * 16 + 7.9;
    expect(xPlanes.has(r3(-end))).toBe(true);
    expect(xPlanes.has(r3(end))).toBe(false);
    const rounded = zCylinders.filter((cyl) => r3(cyl.radius) === 7.9).map((cyl) => r3(cyl.origin[0]));
    expect(rounded).toEqual([r3(end)]);
  });

  it("is 120 mm long with the default seven sections", async () => {
    const g = stepGeometry(
      await buildPart({ partId: "underside-calibration", params: defaults, clearance: NO_CLEARANCE }).blobSTEP().text(),
    );
    const flat = Math.min(...g.planes.filter((p) => Math.abs(p.normal[0]) === 1).map((p) => p.origin[0]));
    const arc = g.cylinders.find((c) => r3(c.radius) === 7.9)!;
    expect(r3(arc.origin[0] + 7.9 - flat)).toBe(119.7); // the flat end at -55.9 to the arc's far side at 63.8
  });
});
