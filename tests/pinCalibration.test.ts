import "./openCascade";
import { describe, it, expect } from "vitest";

import { requirePart, validatePart } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { calibrationClearances, type CalibrationParams } from "../src/parts/calibration";
import { NO_CLEARANCE } from "../src/spec";
import { analyseStep, stepGeometry } from "./stepStats";

// Expected values written out by hand: round stubs Ø4.8 plus each stub's change,
// 16 mm apart, 8 mm tall on a 4 mm bar centred on z = 0.
const part = requirePart("pin-calibration");
const defaults: CalibrationParams = { perSide: 4, step: 0.05, centre: 0 };
const r3 = (n: number) => Number(n.toFixed(3));

describe("pin calibration bar parameters", () => {
  it("defaults are valid, use no global clearance, and name the file", () => {
    expect(validatePart(part, defaults)).toBeNull();
    expect(part.clearance).toEqual([]);
    expect(part.filename(defaults)).toBe("pin-calibration-9-stubs");
  });

  it("allows sizes up to the ±0.5 mm pin limit", () => {
    expect(validatePart(part, { perSide: 5, step: 0.1, centre: 0 })).toBeNull();
    expect(validatePart(part, { perSide: 6, step: 0.1, centre: 0 })).toMatch(/beyond the limit/);
  });
});

describe("pin calibration bar STEP export", () => {
  it.each([
    defaults,
    { perSide: 5, step: 0.1, centre: 0 },
    { perSide: 1, step: 0.01, centre: 0 },
    { perSide: 2, step: 0.1, centre: 0.25 },
  ])("%j: one solid; every stub at its diameter, 16 mm apart, 8 mm tall", async (params) => {
    const step = await buildPart({ partId: "pin-calibration", params, clearance: NO_CLEARANCE }).blobSTEP().text();
    const stats = analyseStep(step);
    const g = stepGeometry(step);
    expect((step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length).toBe(1);
    expect(Object.keys(stats.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
    expect(Object.keys(stats.edgeTypes).sort()).toEqual(["CIRCLE", "LINE"]);

    calibrationClearances(params).forEach((c, k) => {
      // The last stub shares its axis with the bar's rounded end (Ø7.2): look past that one.
      const stub = g.cylinders.find(
        (cyl) =>
          r3(cyl.origin[0]) === r3((k - params.perSide) * 16) &&
          r3(cyl.origin[1]) === 0 &&
          Math.abs(cyl.axis[2]) === 1 &&
          r3(2 * cyl.radius) !== 7.2,
      );
      expect(stub && r3(2 * stub.radius), `stub ${c}`).toBe(r3(4.8 + c));
    });
    const zs = g.planes.filter((p) => Math.abs(p.normal[2]) === 1).map((p) => r3(p.origin[2]));
    expect(Math.min(...zs)).toBe(-2);
    expect(Math.max(...zs)).toBe(10);
  });
});
