import "./openCascade";
import { describe, it, expect } from "vitest";

import { requirePart, validatePart } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { calibrationClearances, type CalibrationParams } from "../src/parts/calibration";
import { NO_CLEARANCE } from "../src/spec";
import { analyseStep, stepGeometry } from "./stepStats";

// Expected values written out by hand: an axle along X, one 8 mm section per
// size, cross 4.8 × 1.6 plus the section's change, small end bevelled 0.2 mm
// inside its nominal end, a Ø6.0 × 0.8 stop flush with the large end.
const part = requirePart("axle-calibration");
const defaults: CalibrationParams = { perSide: 4, step: 0.05, centre: 0 };
const r3 = (n: number) => Number(n.toFixed(3));
const isAxis = (v: number[], i: number) => Math.abs(Math.abs(v[i]!) - 1) < 1e-9;

const exportAxle = async (params: CalibrationParams) => {
  const step = await buildPart({ partId: "axle-calibration", params, clearance: NO_CLEARANCE }).blobSTEP().text();
  return { step, stats: analyseStep(step), geometry: stepGeometry(step) };
};

describe("calibration axle parameters", () => {
  it("defaults give -0.20 .. +0.20 mm in 0.05 mm steps, uses no global clearance", () => {
    expect(calibrationClearances(defaults)).toEqual([-0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2]);
    expect(validatePart(part, defaults)).toBeNull();
    expect(part.clearance).toEqual([]);
    expect(part.filename(defaults)).toBe("axle-calibration-9-sections");
  });

  it("allows sizes up to the ±0.5 mm axle limit", () => {
    expect(validatePart(part, { perSide: 5, step: 0.1, centre: 0 })).toBeNull(); // exactly 0.5
    expect(validatePart(part, { perSide: 6, step: 0.1, centre: 0 })).toMatch(/beyond the limit/);
  });
});

describe("calibration axle STEP export", () => {
  it.each([
    defaults,
    { perSide: 5, step: 0.1, centre: 0 },
    { perSide: 1, step: 0.01, centre: 0 },
    { perSide: 2, step: 0.1, centre: 0.25 },
  ])("%j: one solid; a section per size, one stud each, growing towards the stop", async (params) => {
    const { step, stats, geometry } = await exportAxle(params);
    expect((step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length).toBe(1);
    expect(Object.keys(stats.faceTypes).filter((t) => !["PLANE", "CYLINDRICAL_SURFACE"].includes(t))).toEqual([]);
    expect(Object.keys(stats.edgeTypes).filter((t) => !["LINE", "CIRCLE", "ELLIPSE"].includes(t))).toEqual([]);

    const sizes = calibrationClearances(params);
    const half = (sizes.length * 8) / 2;
    const xPlanes = [...new Set(geometry.planes.filter((p) => isAxis(p.normal, 0)).map((p) => r3(p.origin[0])))].sort(
      (a, b) => a - b,
    );
    // Small end face, a step between every pair of sections, the stop's two faces.
    const steps = sizes.slice(1).map((_, k) => r3(-half + 8 * (k + 1)));
    expect(xPlanes).toEqual([r3(-half + 0.2), ...steps, r3(half - 0.8), r3(half)]);

    const ySides = new Set(geometry.planes.filter((p) => isAxis(p.normal, 1)).map((p) => r3(Math.abs(p.origin[1]))));
    const radii = new Set(geometry.cylinders.filter((c) => isAxis(c.axis, 0)).map((c) => r3(c.radius)));
    for (const c of sizes) {
      expect(ySides.has(r3((1.6 + c) / 2)), `arm sides of ${c}`).toBe(true);
      expect(radii.has(r3((4.8 + c) / 2)), `tips of ${c}`).toBe(true);
    }
    expect(radii.has(3), "Ø6.0 stop").toBe(true);
  });
});
