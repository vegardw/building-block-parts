import { describe, it, expect } from "vitest";
import {
  SPEC,
  MIN_WALL,
  MAX_STUDS,
  CLEARANCE_FIELDS,
  NO_CLEARANCE,
  clearanceField,
  type ClearanceKey,
} from "../src/spec";
import { requirePart } from "../src/parts/index";

// The nominal dimensions are fractions of the module L = pitch (docs/dimensions.md).
// Checking the ratios catches a typo in one constant.
describe("SPEC", () => {
  const L = SPEC.pitch;

  it("uses the 8 mm module", () => {
    expect(L).toBe(8);
  });

  const fractions: [keyof typeof SPEC, number][] = [
    ["width", 0.9],
    ["height", 1],
    ["halfHeight", 0.5],
    ["holeD", 0.6],
    ["cboreDepth", 0.1],
  ];
  it.each(fractions)("%s is %s L", (key, fraction) => {
    expect(SPEC[key]).toBeCloseTo(fraction * L, 10);
  });

  // Measured rather than a fraction of L (docs/dimensions.md).
  it("uses the measured counterbore and collar sizes", () => {
    expect(SPEC.cboreD).toBe(6.2);
    expect(SPEC.collarD).toBe(6);
  });

  it("leaves at least MIN_WALL beside the nominal counterbore", () => {
    expect((SPEC.width - SPEC.cboreD) / 2).toBeGreaterThanOrEqual(MIN_WALL);
  });
});

describe("clearanceField", () => {
  it("finds the field of every fit setting", () => {
    for (const key of Object.keys(NO_CLEARANCE) as ClearanceKey[]) expect(clearanceField(key).key).toBe(key);
    expect(CLEARANCE_FIELDS.map((f) => clearanceField(f.key))).toEqual(CLEARANCE_FIELDS);
  });

  it("names an unknown setting instead of failing on undefined", () => {
    expect(() => clearanceField("colour" as ClearanceKey)).toThrow("Unknown fit setting: colour");
  });
});

describe("MAX_STUDS", () => {
  const maxOf = (partId: string, key: string) => {
    const p = requirePart(partId).params.find((d) => d.key === key);
    return p?.type === "choice" ? undefined : p?.max;
  };

  it("is the longest genuine axle, and the longest beam and axle the app makes", () => {
    expect(MAX_STUDS).toBe(32);
    expect(maxOf("beam", "holes")).toBe(MAX_STUDS);
    expect(maxOf("axle", "length")).toBe(MAX_STUDS);
  });

  it("gives a longest beam that fits a 256 mm bed", () => {
    expect((MAX_STUDS - 1) * SPEC.pitch + SPEC.width).toBeCloseTo(255.2, 9);
  });
});
