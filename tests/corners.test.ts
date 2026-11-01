import "./openCascade";
import { describe, it, expect } from "vitest";

import { requirePart, validatePart } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { calibrationClearances, type CalibrationParams } from "../src/parts/calibration";
import { NO_CLEARANCE, type Clearance } from "../src/spec";
import { analyseStep, stepGeometry } from "./stepStats";
import { measureBeam, gaps, expectedBeam, NOMINAL, BEAM_HEIGHTS } from "./beamGeometry";

// The edges of what validation allows, built for real: every case validation
// accepts must build, export only planes/cylinders and have the right
// dimensions; every case it rejects must fail with the validation message,
// before reaching the CAD kernel.

const stepText = (partId: string, params: Record<string, number>, clearance: Clearance) =>
  buildPart({ partId, params, clearance }).blobSTEP().text();

const expectAnalytic = (step: string) => {
  const s = analyseStep(step);
  expect(Object.keys(s.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
  expect(Object.keys(s.edgeTypes).sort()).toEqual(["CIRCLE", "LINE"]);
};

describe.each(Object.keys(BEAM_HEIGHTS))("%s-height beam: corners of the clearance range", (name) => {
  const partId = "beam";
  const beam = requirePart(partId);
  const { height, nominal } = BEAM_HEIGHTS[name]!;
  const steps = [-1, 0, 1]; // the ±1 mm limit and nominal, per field
  const grid: Clearance[] = steps.flatMap((hole) =>
    steps.flatMap((width) => steps.map((height) => ({ ...NO_CLEARANCE, hole, width, height }))),
  );
  // Exactly at the 0.2 mm wall limit (needs the rounding slack), and just past it.
  const atWallLimit: Clearance[] = [
    { ...NO_CLEARANCE, hole: 0.6 },
    { ...NO_CLEARANCE, hole: 0.4, width: -0.2 },
  ];
  const valid = [...grid, ...atWallLimit].filter((c) => validatePart(beam, { holes: 2, height }, c) === null);
  const invalid = grid.filter((c) => validatePart(beam, { holes: 2, height }, c) !== null);

  it("accepts the wall limit itself and rejects just past it", () => {
    expect(validatePart(beam, { holes: 3, height }, { ...NO_CLEARANCE, hole: 0.6 })).toBeNull();
    expect(validatePart(beam, { holes: 3, height }, { ...NO_CLEARANCE, hole: 0.4, width: -0.2 })).toBeNull();
    expect(validatePart(beam, { holes: 3, height }, { ...NO_CLEARANCE, hole: 0.61 })).toMatch(/wall/);
  });

  it("the grid has both kinds of case", () => {
    expect(valid.length).toBeGreaterThan(10);
    expect(invalid.length).toBeGreaterThan(5);
  });

  // 2 holes is the shortest beam, 32 the longest.
  it.each([2, 32].flatMap((holes) => valid.map((c) => [holes, c] as const)))(
    "%i holes, clearance %j: builds with the right dimensions",
    async (holes, clearance) => {
      const step = await stepText(partId, { holes, height }, clearance);
      expectAnalytic(step);
      const m = measureBeam(stepGeometry(step));
      expect(m).toMatchObject(expectedBeam(holes, clearance, nominal));
      expect(gaps(m.holeX).every((g) => g === NOMINAL.pitch)).toBe(true);
      expect(m.centre).toEqual([0, 0, 0]);
    },
  );

  it.each(invalid)("clearance %j: refused with the validation message", (clearance) => {
    const message = validatePart(beam, { holes: 2, height }, clearance)!;
    expect(() => buildPart({ partId, params: { holes: 2, height }, clearance })).toThrow(message);
  });
});

describe("calibration bar: corners of the parameter range", () => {
  const part = requirePart("calibration");
  const corners: CalibrationParams[] = [
    { perSide: 1, step: 0.01, centre: 0 }, // smallest bar, finest step
    { perSide: 1, step: 0.2, centre: 0 }, // smallest bar, coarsest step
    { perSide: 7, step: 0.01, centre: 0 }, // longest bar
    { perSide: 7, step: 0.085, centre: 0 }, // longest bar, largest clearance just under the limit (0.595)
    { perSide: 3, step: 0.2, centre: 0 }, // largest clearance exactly at the 0.6 limit
  ];

  it.each(corners)("%j: builds every hole at its clearance, 8 mm apart", async (params) => {
    expect(validatePart(part, params, NO_CLEARANCE)).toBeNull();
    const step = await stepText("calibration", params, NO_CLEARANCE);
    expectAnalytic(step);

    const cylinders = stepGeometry(step).cylinders;
    const clearances = calibrationClearances(params);
    // Bores: one per clearance, at its own diameter, at x = (k - perSide) × 8.
    const bores = clearances.map((c, k) => {
      const x = (k - params.perSide) * NOMINAL.pitch;
      return cylinders.find(
        (h) => Math.abs(h.origin[0] - x) < 1e-6 && Math.abs(2 * h.radius - (NOMINAL.holeD + c)) < 1e-6,
      );
    });
    expect(bores.every(Boolean), "a bore of the right size at every position").toBe(true);
  });

  it("refuses one step past the limit, before reaching the kernel", () => {
    const params = { perSide: 4, step: 0.16, centre: 0 }; // 0.64 mm > 0.6
    const message = validatePart(part, params, NO_CLEARANCE)!;
    expect(message).toMatch(/beyond the limit/);
    expect(() => buildPart({ partId: "calibration", params, clearance: NO_CLEARANCE })).toThrow(message);
  });
});
