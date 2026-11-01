import "./openCascade";
import { describe, it, expect } from "vitest";
import { PARTS, requirePart, validatePart } from "../src/parts/index";
import type { NumberParamDef } from "../src/parts/types";
import { calibrationClearances, MAX_CLEARANCE, type CalibrationParams } from "../src/parts/calibration";
import { buildPart } from "../src/parts/builders";
import { NO_CLEARANCE, SPEC } from "../src/spec";
import { analyseStep } from "./stepStats";

const part = requirePart("calibration");
const defaults: CalibrationParams = { perSide: 4, step: 0.05, centre: 0 };
const stepOf = (params: CalibrationParams) =>
  buildPart({ partId: "calibration", params, clearance: NO_CLEARANCE }).blobSTEP().text();

describe("calibration bar parameters", () => {
  it("defaults give -0.20 .. +0.20 mm in 0.05 mm steps, nominal in the middle", () => {
    expect(calibrationClearances(defaults)).toEqual([-0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2]);
    expect(validatePart(part, defaults, NO_CLEARANCE)).toBeNull();
  });

  it("rejects a range that would leave the counterbore walls too thin", () => {
    expect(MAX_CLEARANCE).toBeCloseTo(0.6);
    expect(validatePart(part, { perSide: 7, step: 0.1, centre: 0 }, NO_CLEARANCE)).toMatch(/beyond the limit/);
    expect(validatePart(part, { perSide: 6, step: 0.1, centre: 0 }, NO_CLEARANCE)).toBeNull();
  });
});

describe("calibration bar STEP export", () => {
  it("keeps true cylinders: one per hole feature plus the rounded end", async () => {
    const s = analyseStep(await stepOf(defaults));
    expect(s.faceTypes.CYLINDRICAL_SURFACE).toBe(3 * 9 + 1);
  });

  it("has a bore and a counterbore of the right size for every clearance", async () => {
    const step = await stepOf(defaults);
    const radii = new Set(
      [...step.matchAll(/CYLINDRICAL_SURFACE\s*\(\s*'[^']*'\s*,\s*#\d+\s*,\s*([0-9.eE+-]+)\s*\)/g)].map((m) =>
        Number(Number(m[1]).toFixed(3)),
      ),
    );
    for (const c of calibrationClearances(defaults)) {
      expect(radii, `bore for ${c}`).toContain(Number(((SPEC.holeD + c) / 2).toFixed(3)));
      expect(radii, `counterbore for ${c}`).toContain(Number(((SPEC.cboreD + c) / 2).toFixed(3)));
    }
  });
});

// The middle value is shared by every calibration part: it shifts all values,
// which must still stay within the part's limit on both sides.
describe("middle value", () => {
  it("shifts every value by the middle value", () => {
    expect(calibrationClearances({ perSide: 2, step: 0.05, centre: 0.2 })).toEqual([0.1, 0.15, 0.2, 0.25, 0.3]);
    expect(calibrationClearances({ perSide: 1, step: 0.1, centre: -0.15 })).toEqual([-0.25, -0.15, -0.05]);
  });

  it("keeps the hole bar within ±0.6 mm on either side", () => {
    expect(validatePart(part, { perSide: 4, step: 0.05, centre: 0.4 }, NO_CLEARANCE)).toBeNull(); // reaches 0.6
    expect(validatePart(part, { perSide: 4, step: 0.05, centre: 0.45 }, NO_CLEARANCE)).toBe(
      "The values would reach +0.65 mm, beyond the limit of ±0.60 mm, which keeps the counterbore walls at least 0.2 mm thick. Use a smaller step, fewer holes or a middle value nearer 0.",
    );
    expect(validatePart(part, { perSide: 4, step: 0.05, centre: -0.45 }, NO_CLEARANCE)).toMatch(/reach −0\.65 mm/);
    expect(validatePart(part, { perSide: 1, step: 0.05, centre: 0.7 }, NO_CLEARANCE)).toMatch(/^Middle value/);
  });

  it.each(PARTS.filter((p) => p.calibration).map((p) => p.id))("%s: limits the shifted range too", (id) => {
    const p = requirePart(id);
    const limit = (p.params.find((d) => d.key === "centre") as NumberParamDef).max;
    expect(validatePart(p, { perSide: 4, step: 0.05, centre: limit - 0.2 }, NO_CLEARANCE)).toBeNull();
    expect(validatePart(p, { perSide: 4, step: 0.05, centre: -(limit - 0.2) }, NO_CLEARANCE)).toBeNull();
    expect(validatePart(p, { perSide: 4, step: 0.05, centre: limit - 0.15 }, NO_CLEARANCE)).toMatch(/beyond the limit/);
  });

  it("names the file after a middle value off nominal", () => {
    expect(part.filename({ perSide: 4, step: 0.05, centre: 0 })).toBe("hole-calibration-9-holes");
    expect(part.filename({ perSide: 4, step: 0.05, centre: 0.2 })).toBe("hole-calibration-9-holes-plus-0.20");
    expect(part.filename({ perSide: 4, step: 0.05, centre: -0.1 })).toBe("hole-calibration-9-holes-minus-0.10");
  });

  it("lists the range from end to end", () => {
    expect(part.info!({ perSide: 4, step: 0.05, centre: 0.2 })).toBe(
      "9 holes, from 0.00 mm at the flat end to +0.40 mm at the rounded end; the middle hole, marked by the tabs, is +0.20 mm.",
    );
  });

  it("builds every hole of a bar centred off nominal at its size", async () => {
    const params = { perSide: 2, step: 0.1, centre: 0.3 };
    const step = await stepOf(params);
    const radii = new Set(
      [...step.matchAll(/CYLINDRICAL_SURFACE\s*\(\s*'[^']*'\s*,\s*#\d+\s*,\s*([0-9.eE+-]+)\s*\)/g)].map((m) =>
        Number(Number(m[1]).toFixed(3)),
      ),
    );
    for (const c of [0.1, 0.2, 0.3, 0.4, 0.5]) {
      expect(radii, `bore for ${c}`).toContain(Number(((4.8 + c) / 2).toFixed(3)));
      expect(radii, `counterbore for ${c}`).toContain(Number(((6.2 + c) / 2).toFixed(3)));
    }
  });
});
