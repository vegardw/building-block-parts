import "./openCascade";
import { describe, it, expect } from "vitest";

import { requirePart, validatePart, paramProblem } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { AXLE_ENDS, type AxleParams } from "../src/parts/axle";
import { NO_CLEARANCE } from "../src/spec";
import { analyseStep, stepGeometry, type StepGeometry } from "./stepStats";

// Expected values written out by hand (docs/dimensions.md), not taken from AXLE.
const PLAIN = 0,
  NOTCHED = 1,
  STOP = 2,
  STUD = 3,
  STOP_IN = 4;
const part = requirePart("axle");
const params = (p: Partial<AxleParams>): AxleParams => ({ length: 4, endA: PLAIN, endB: PLAIN, ...p });

const r3 = (n: number) => Number(n.toFixed(3));
const uniqueSorted = (xs: number[]) => [...new Set(xs.map(r3))].sort((a, b) => a - b);
const isAxis = (v: number[], i: number) => Math.abs(Math.abs(v[i]!) - 1) < 1e-9;

// The axle lies along X: faces across it are planes with an X normal.
function measureAxle(g: StepGeometry) {
  return {
    xPlanes: uniqueSorted(g.planes.filter((p) => isAxis(p.normal, 0)).map((p) => p.origin[0])),
    armSidesY: uniqueSorted(g.planes.filter((p) => isAxis(p.normal, 1)).map((p) => p.origin[1])),
    armSidesZ: uniqueSorted(g.planes.filter((p) => isAxis(p.normal, 2)).map((p) => p.origin[2])),
    radii: uniqueSorted(g.cylinders.map((c) => c.radius)),
    alongX: g.cylinders.every((c) => isAxis(c.axis, 0) && r3(c.origin[1]) === 0 && r3(c.origin[2]) === 0),
  };
}

async function exportAxle(p: AxleParams, size = 0, collar = 0) {
  const clearance = { ...NO_CLEARANCE, axle: size, collar };
  const step = await buildPart({ partId: "axle", params: p, clearance }).blobSTEP().text();
  return { step, stats: analyseStep(step), geometry: stepGeometry(step) };
}

const solids = (step: string) => (step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length;

describe("axle parameters", () => {
  it("accepts half-stud lengths and rejects other fractions", () => {
    expect(validatePart(part, params({ length: 5.5 }))).toBeNull();
    expect(validatePart(part, params({ length: 1 }))).toBeNull();
    expect(validatePart(part, params({ length: 4.25 }))).toMatch(/in steps of 0.5/);
    expect(validatePart(part, params({ length: 0.5 }))).toMatch(/from 1 to 32/);
  });

  // Half studs are the length's step: an off-step length is the field's own problem, shown under it.
  it("reports a length between half studs under the Length field", () => {
    expect(paramProblem(part, params({ length: 5.3 }))).toEqual({
      key: "length",
      message: "Length (studs) must be a number from 1 to 32, in steps of 0.5.",
    });
    expect(paramProblem(part, params({ length: 31.5 }))).toBeNull();
  });

  it("refuses ends that don't fit the length", () => {
    // Notches end 4.8 mm in, so two need 9.6 mm: more than 1 stud, enough for 1.5.
    expect(validatePart(part, params({ length: 1, endA: NOTCHED, endB: NOTCHED }))).toMatch(/too short/);
    expect(validatePart(part, params({ length: 1.5, endA: NOTCHED, endB: NOTCHED }))).toBeNull();
    // A stop one stud in needs 8 + 3.2 mm; with a stop (0.8) that is exactly 1.5 studs (12 mm),
    // with a plain end (0.2 inset + 0.8 bevel) 0.2 mm too much.
    expect(validatePart(part, params({ length: 1.5, endA: STOP_IN, endB: STOP }))).toBeNull();
    expect(validatePart(part, params({ length: 1.5, endA: STOP_IN, endB: PLAIN }))).toMatch(/too short/);
    expect(validatePart(part, params({ length: 2, endA: STOP_IN, endB: PLAIN }))).toBeNull();
  });

  it("keeps a stop at least 0.2 mm wider than the cross", () => {
    // Stop one stud in: 5.75 + collar against 4.8 + axle size.
    const c = (axle: number, collar: number) => ({ ...NO_CLEARANCE, axle, collar });
    expect(validatePart(part, params({ length: 5.5, endA: STOP_IN }), c(0.5, -0.5))).toMatch(/less than 0.2 mm wider/);
    expect(validatePart(part, params({ length: 5.5, endA: STOP_IN }), c(0.25, -0.5))).toBeNull(); // 5.25 vs 5.05
    expect(validatePart(part, params({ length: 5.5, endA: STOP_IN }), c(0.5, 0.5))).toBeNull();
    // A plain axle has no stop, so the check doesn't apply.
    expect(validatePart(part, params({}), c(0.5, -0.5))).toBeNull();
  });

  it("refuses an unknown end type", () => {
    expect(validatePart(part, params({ endA: 9 }))).toMatch(/Choose a value for End 1/);
  });

  it("names the file after length and ends", () => {
    expect(part.filename(params({ length: 5.5, endA: STOP_IN }))).toBe("axle-5.5-stop-in-plain");
    expect(part.filename(params({ endA: STUD, endB: NOTCHED }))).toBe("axle-4-stud-notched");
  });

  it("uses the global axle size and collar diameter, each ±0.5 mm", () => {
    expect(part.clearance).toEqual(["axle", "collar"]);
    expect(validatePart(part, params({ endA: STOP }), { ...NO_CLEARANCE, collar: -0.5 })).toBeNull();
    expect(validatePart(part, params({}), { ...NO_CLEARANCE, collar: 0.51 })).toMatch(/Collar diameter clearance/);
    expect(validatePart(part, params({}), { ...NO_CLEARANCE, axle: 0.5 })).toBeNull();
    expect(validatePart(part, params({}), { ...NO_CLEARANCE, axle: -0.51 })).toMatch(/Axle size clearance/);
    // The beam clearance fields don't apply to axles.
    expect(validatePart(part, params({}), { ...NO_CLEARANCE, hole: 5 })).toBeNull();
  });
});

describe("axle dimensions in the exported STEP file", () => {
  // 5.5 studs = 44 mm nominal, ends at x = ±22.
  it("plain ends: bevelled, faces 0.2 mm inside the nominal length, 4.8 × 1.6 cross", async () => {
    const { stats, geometry, step } = await exportAxle(params({ length: 5.5 }));
    const m = measureAxle(geometry);
    expect(solids(step)).toBe(1);
    expect(m.xPlanes).toEqual([-21.8, 21.8]);
    expect(m.radii).toEqual([2.4]);
    expect(m.armSidesY).toEqual([-0.8, 0.8]);
    expect(m.armSidesZ).toEqual([-0.8, 0.8]);
    expect(m.alongX).toBe(true);
    expect(stats.edgeTypes.ELLIPSE).toBeGreaterThanOrEqual(8); // bevel planes on the round tips, 4 per end
  });

  it("notched ends: grooves 3.6 to 4.8 mm from each end, floor Ø3.2, axle still one piece", async () => {
    const { geometry, step } = await exportAxle(params({ length: 5.5, endA: NOTCHED, endB: NOTCHED }));
    const m = measureAxle(geometry);
    expect(solids(step)).toBe(1);
    expect(m.xPlanes).toEqual([-21.8, -18.4, -17.2, 17.2, 18.4, 21.8]);
    expect(m.radii).toEqual([1.6, 2.4]);
  });

  it("stop: a Ø6.0 × 0.8 flange flush with the end (measured collar size)", async () => {
    const m = measureAxle((await exportAxle(params({ length: 5.5, endA: STOP }))).geometry);
    expect(m.xPlanes).toEqual([-22, -21.2, 21.8]);
    expect(m.radii).toEqual([2.4, 3]);
  });

  it("stop with stud: Ø6.0 flange plus a Ø4.8 × 1.6 open stud (Ø3.2 bore) beyond the end", async () => {
    const m = measureAxle((await exportAxle(params({ length: 3, endB: STUD }))).geometry);
    // 3 studs = 24 mm: plain end at -11.8; flange 11.2..12; stud to 13.6, bore floor at 12.
    expect(m.xPlanes).toEqual([-11.8, 11.2, 12, 13.6]);
    expect(m.radii).toEqual([1.6, 2.4, 3]);
  });

  it("stop one stud in: Ø5.75 flange 7.2 to 8 mm from the end, round section to 11.2 mm", async () => {
    const m = measureAxle((await exportAxle(params({ length: 5.5, endA: STOP_IN }))).geometry);
    expect(m.xPlanes).toEqual([-21.8, -14.8, -14, -10.8, 21.8]);
    expect(m.radii).toEqual([2.4, 2.875]);
  });

  it("axle size changes the cross, collar diameter the stop", async () => {
    const sized = measureAxle((await exportAxle(params({ endA: STOP }), -0.2)).geometry);
    expect(sized.armSidesY).toEqual([-0.7, 0.7]);
    expect(sized.radii).toEqual([2.3, 3]);
    const collared = measureAxle((await exportAxle(params({ endA: STOP, endB: STOP_IN, length: 5 }), 0, 0.1)).geometry);
    expect(collared.armSidesY).toEqual([-0.8, 0.8]);
    expect(collared.radii).toEqual([2.4, 2.925, 3.05]);
  });
});

// Every pair of ends, at the shortest length validation allows and at the maximum.
describe("axle: every end combination at its limits", () => {
  const pairs = AXLE_ENDS.flatMap((a) => AXLE_ENDS.map((b) => [a, b] as const));
  const shortest = (a: number, b: number) => {
    for (let length = 1; length <= 32; length += 0.5) {
      if (validatePart(part, params({ length, endA: a, endB: b })) === null) return length;
    }
    throw new Error("no valid length");
  };
  const cases = pairs.flatMap(([a, b]) => [
    [a.id, b.id, shortest(a.value, b.value), a.value, b.value] as const,
    [a.id, b.id, 32, a.value, b.value] as const,
  ]);

  it.each(cases)("%s + %s, %s studs: one solid, analytic, right length", async (_a, _b, length, endA, endB) => {
    for (const size of [-0.5, 0.5]) {
      const { step, stats, geometry } = await exportAxle({ length, endA, endB }, size, size);
      expect(solids(step)).toBe(1);
      expect(Object.keys(stats.faceTypes).filter((t) => !["PLANE", "CYLINDRICAL_SURFACE"].includes(t))).toEqual([]);
      expect(Object.keys(stats.edgeTypes).filter((t) => !["LINE", "CIRCLE", "ELLIPSE"].includes(t))).toEqual([]);
      const xs = measureAxle(geometry).xPlanes;
      const half = (length * 8) / 2;
      // The outermost faces: plain-type ends 0.2 mm inside, stops flush, studs 1.6 mm beyond.
      const outer = (id: number) => (id === STUD ? half + 1.6 : id === STOP ? half : half - 0.2);
      expect(xs[0]).toBe(r3(-outer(endA)));
      expect(xs[xs.length - 1]).toBe(r3(outer(endB)));
    }
  });
});
