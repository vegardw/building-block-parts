import { describe, it, expect } from "vitest";

import { validatePart } from "../src/parts/index";
import { PIN_SIDES, pinLength } from "../src/parts/pin";
import { NO_CLEARANCE } from "../src/spec";
import { part, params, r3, measurePin, exportPin, solids } from "./pinGeometry";

// Every pair of pin sides with one kind of end, at both clearance extremes that
// validation allows: one solid, analytic, the right length. Split by end type into
// two test files so the two halves run in parallel.
export function testSideCombinations(ends: number, name: string) {
  describe(`pin: every side combination, ${name} ends`, () => {
    const pairs = PIN_SIDES.flatMap((a) => PIN_SIDES.map((b) => [a, b] as const)).filter(
      ([a, b]) => validatePart(part, params({ sideA: a.value, sideB: b.value })) === null,
    );
    const cases = pairs.map(([a, b]) => [a.id, b.id, a.value, b.value] as const);

    it.each(cases)("%s + %s: one solid, analytic, right length", async (_a, _b, sideA, sideB) => {
      for (const size of [-0.3, 0.3]) {
        const p = { sideA, sideB, ends };
        const clearance = { ...NO_CLEARANCE, pin: size, collar: size, axle: size };
        expect(validatePart(part, p, clearance)).toBeNull();
        const { step, stats, geometry } = await exportPin(p, clearance);
        expect(solids(step)).toBe(1);
        expect(Object.keys(stats.faceTypes).filter((t) => !["PLANE", "CYLINDRICAL_SURFACE"].includes(t))).toEqual([]);
        expect(Object.keys(stats.edgeTypes).filter((t) => !["LINE", "CIRCLE", "ELLIPSE"].includes(t))).toEqual([]);
        const xs = measurePin(geometry).xPlanes;
        expect(r3(xs[xs.length - 1]! - xs[0]!)).toBe(r3(pinLength(p)));
      }
    });
  });
}
