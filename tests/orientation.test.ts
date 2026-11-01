import "./openCascade";
import { describe, it, expect } from "vitest";

import { requirePart, defaultText, parseParams } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { NO_CLEARANCE } from "../src/spec";
import { stepGeometry } from "./stepStats";

// Every part lies along X with its first end at -X: an axle's End 1, a pin's
// Side 1, a calibration part's smaller values. The preview's starting view shows
// -X on the left (tests/cameraFit.test.ts), the same order as the form and the
// Calibrate section's Result row. Expected values written out by hand.
const geometry = async (partId: string, params?: Record<string, number>) => {
  const part = requirePart(partId);
  const p = params ?? parseParams(part, defaultText(part));
  return stepGeometry(await buildPart({ partId, params: p, clearance: NO_CLEARANCE }).blobSTEP().text());
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const alongX = (v: number[]) => near(Math.abs(v[0]!), 1);
const alongZ = (v: number[]) => near(Math.abs(v[2]!), 1);

describe("parts lie along X with their first end at -X", () => {
  it("axle: End 1 (a stop) at -X, End 2 (plain) at +X", async () => {
    const g = await geometry("axle", { length: 4, endA: 2, endB: 0 }); // stop, plain
    const flange = g.cylinders.filter((c) => alongX(c.axis) && near(c.radius, 3)); // the Ø6.0 stop
    expect(flange.length).toBeGreaterThan(0);
    for (const c of flange) expect(c.origin[0]).toBeLessThan(-15);
  });

  it("pin: Side 1 (a stud) at -X, Side 2 (a 2-stud pin) at +X", async () => {
    const g = await geometry("pin", { sideA: 6, sideB: 1, ends: 1 }); // stud, pin 2 studs, plain ends
    const xs = g.planes.filter((p) => alongX(p.normal)).map((p) => p.origin[0]);
    expect(Math.min(...xs)).toBeCloseTo(-1.6, 6); // the stud's top
    expect(Math.max(...xs)).toBeCloseTo(16, 6); // the pin's tip
  });

  // The flat end is a plane at -X; the rounded end is a half cylinder (radius 3.6, along Z) at +X.
  it.each(["calibration", "pin-calibration", "collar-calibration"])(
    "%s: flat end at -X, rounded end at +X",
    async (id) => {
      const pitch = { calibration: 8, "pin-calibration": 16, "collar-calibration": 8 }[id]!;
      const end = 4 * pitch + 3.6; // default 4 features per side
      const g = await geometry(id);
      expect(g.planes.some((p) => alongX(p.normal) && near(p.origin[0], -end))).toBe(true);
      expect(g.planes.some((p) => alongX(p.normal) && near(p.origin[0], end))).toBe(false);
      const rounded = g.cylinders.filter((c) => alongZ(c.axis) && near(c.radius, 3.6));
      expect(rounded.map((c) => c.origin[0])).toEqual([4 * pitch]);
    },
  );

  it("calibration axle: small end at -X, stop at +X", async () => {
    const g = await geometry("axle-calibration");
    const stop = g.cylinders.filter((c) => alongX(c.axis) && near(c.radius, 3));
    expect(stop.length).toBeGreaterThan(0);
    for (const c of stop) expect(c.origin[0]).toBeGreaterThan(30);
  });
});
