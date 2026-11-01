import "./openCascade";
import { describe, it, expect } from "vitest";

import { requirePart, validatePart } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { calibrationClearances, type CalibrationParams } from "../src/parts/calibration";
import { NO_CLEARANCE } from "../src/spec";
import { analyseStep, stepGeometry } from "./stepStats";

// Expected values written out by hand: buttons 8 mm apart, Ø6.0 (the measured
// collar size) plus each button's change, 0.6 mm tall on a 4 mm bar centred on z = 0.
const part = requirePart("collar-calibration");
const defaults: CalibrationParams = { perSide: 4, step: 0.05, centre: 0 };
const r3 = (n: number) => Number(n.toFixed(3));

describe("collar calibration bar parameters", () => {
  it("defaults give -0.20 .. +0.20 mm in 0.05 mm steps, uses no global clearance", () => {
    expect(validatePart(part, defaults)).toBeNull();
    expect(part.clearance).toEqual([]);
    expect(part.filename(defaults)).toBe("collar-calibration-9-buttons");
  });

  it("allows sizes up to the ±0.5 mm collar limit", () => {
    expect(validatePart(part, { perSide: 5, step: 0.1, centre: 0 })).toBeNull(); // exactly 0.5
    expect(validatePart(part, { perSide: 6, step: 0.1, centre: 0 })).toMatch(/beyond the limit/);
  });
});

describe("collar calibration bar STEP export", () => {
  it.each([
    defaults,
    { perSide: 5, step: 0.1, centre: 0 },
    { perSide: 1, step: 0.01, centre: 0 },
    { perSide: 2, step: 0.1, centre: 0.25 },
  ])("%j: one solid; every button at its diameter, 8 mm apart, 0.6 mm tall", async (params) => {
    const step = await buildPart({ partId: "collar-calibration", params, clearance: NO_CLEARANCE }).blobSTEP().text();
    const stats = analyseStep(step);
    const g = stepGeometry(step);
    expect((step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length).toBe(1);
    expect(Object.keys(stats.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
    expect(Object.keys(stats.edgeTypes).sort()).toEqual(["CIRCLE", "LINE"]);

    calibrationClearances(params).forEach((c, k) => {
      // The last button shares its axis with the bar's rounded end (Ø7.2): look past that one.
      const button = g.cylinders.find(
        (cyl) =>
          r3(cyl.origin[0]) === r3((k - params.perSide) * 8) &&
          r3(cyl.origin[1]) === 0 &&
          Math.abs(cyl.axis[2]) === 1 &&
          r3(2 * cyl.radius) !== 7.2,
      );
      expect(button && r3(2 * button.radius), `button ${c}`).toBe(r3(6 + c));
    });
    const zs = g.planes.filter((p) => Math.abs(p.normal[2]) === 1).map((p) => r3(p.origin[2]));
    expect(Math.min(...zs)).toBe(-2);
    expect(Math.max(...zs)).toBe(2.6);
  });
});
