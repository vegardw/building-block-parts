import "./openCascade";
import { describe, it, expect } from "vitest";

import { validatePart } from "../src/parts/index";
import { PIN_PRESETS, pinLength, PLAIN } from "../src/parts/pin";
import { NO_CLEARANCE } from "../src/spec";
import { side, part, params, r3, isAxis, measurePin, exportPin, solids } from "./pinGeometry";

// Expected values written out by hand (docs/dimensions.md), not taken from PIN:
// shaft Ø4.8, bore Ø3.2, lip Ø5.2 × 0.8, collar Ø6.0 × 0.8 per pin side, slots
// 3.4 mm from each tip, friction ribs 0.1 mm high in two 2 mm rows.
const PIN1 = side("pin1"),
  PIN15 = side("pin1.5"),
  PIN2 = side("pin2");
const FRIC1 = side("friction1"),
  FRIC2 = side("friction2");
const AXLE1 = side("axle1"),
  AXLE2 = side("axle2"),
  STUD = side("stud");

describe("pin parameters", () => {
  it("needs at least one pin side", () => {
    expect(validatePart(part, params({}))).toBeNull();
    expect(validatePart(part, params({ sideA: AXLE1, sideB: AXLE2 }))).toMatch(/At least one side must be a pin/);
    expect(validatePart(part, params({ sideA: STUD, sideB: AXLE1 }))).toMatch(/At least one side must be a pin/);
    expect(validatePart(part, params({ sideA: STUD, sideB: FRIC1 }))).toBeNull();
  });

  it("keeps the collar at least 0.2 mm wider than the lip, or the shaft on plain ends", () => {
    const c = (pin: number, collar: number) => ({ ...NO_CLEARANCE, pin, collar });
    expect(validatePart(part, params({}), c(0.5, -0.5))).toMatch(/collar .* less than 0.2 mm wider/);
    expect(validatePart(part, params({}), c(0.3, -0.3))).toBeNull(); // lip 5.5, collar 5.7
    expect(validatePart(part, params({ ends: PLAIN }), c(0.5, -0.5))).toBeNull(); // shaft 5.3, collar 5.5
    expect(validatePart(part, params({}), c(0.51, 0))).toMatch(/Pin diameter clearance/);
  });

  it("refuses unknown choices", () => {
    expect(validatePart(part, params({ sideA: 99 }))).toMatch(/Choose a value for Side 1/);
    expect(validatePart(part, params({ ends: 5 }))).toMatch(/Choose a value for Pin ends/);
  });

  it("uses the pin, collar and axle clearances", () => {
    expect(part.clearance).toEqual(["pin", "collar", "axle"]);
  });

  it("names the file after its sides", () => {
    expect(part.filename(params({}))).toBe("pin-pin1-pin1");
    expect(part.filename(params({ sideA: FRIC1, sideB: AXLE2, ends: PLAIN }))).toBe("pin-friction1-axle2-plain");
  });

  // The genuine pins these combinations correspond to (LDraw lengths).
  it.each([
    ["2L pin", PIN1, PIN1, 16],
    ["3L pin", PIN1, PIN2, 24],
    ["axle pin", PIN1, AXLE1, 15.8],
    ["1L pin with 2L axle", FRIC1, AXLE2, 23.8],
    ["1.5-stud pin with 1L axle", PIN15, AXLE1, 19.8],
    ["half pin", PIN1, STUD, 9.6],
  ])("%s is %s + %s = %s mm long", (_name, sideA, sideB, length) => {
    expect(r3(pinLength(params({ sideA, sideB })))).toBe(length);
  });
});

// The quick picks on the form, by what they are; lengths as for the genuine pins above.
describe("common pins (quick picks)", () => {
  it.each([
    ["2L pin", PIN1, PIN1, 16],
    ["2L friction pin", FRIC1, FRIC1, 16],
    ["3L pin", PIN1, PIN2, 24],
    ["3L friction pin", FRIC1, FRIC2, 24],
    ["Axle pin", PIN1, AXLE1, 15.8],
    ["Axle pin with friction", FRIC1, AXLE1, 15.8],
    ["Half pin", PIN1, STUD, 9.6],
  ])("%s: %s + %s, %s mm long and valid", (label, sideA, sideB, length) => {
    const preset = PIN_PRESETS.find((p) => p.label === label)!;
    expect(preset.params).toEqual({ sideA, sideB });
    expect(r3(pinLength(params(preset.params)))).toBe(length);
    expect(validatePart(part, params(preset.params))).toBeNull();
  });

  it("are offered on the form and all different", () => {
    expect(part.presets?.options).toBe(PIN_PRESETS);
    expect(PIN_PRESETS).toHaveLength(7);
    expect(new Set(PIN_PRESETS.map((p) => `${p.params.sideA}-${p.params.sideB}`)).size).toBe(7);
  });
});

describe("pin dimensions in the exported STEP file", () => {
  it("2L pin: tips at ±8, lips 0.8 long, slots 3.4 in, 1.6 mm collar; Ø3.2 bore, Ø4.8 shaft, Ø5.2 lip, Ø6.0 collar", async () => {
    const { step, stats, geometry } = await exportPin(params({}));
    const m = measurePin(geometry);
    expect(solids(step)).toBe(1);
    expect(Object.keys(stats.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
    expect(m.xPlanes).toEqual([-8, -7.2, -4.6, -0.8, 0.8, 4.6, 7.2, 8]);
    expect(m.radii).toEqual([1.6, 2.4, 2.6, 3]);
    expect(m.alongX).toBe(true);
    // Slot sides 0.8 mm apart.
    const slotSides = new Set(geometry.planes.filter((p) => isAxis(p.normal, 1)).map((p) => r3(p.origin[1])));
    expect([...slotSides].sort((a, b) => a - b)).toEqual([-0.4, 0.4]);
  });

  it("friction pin: ribs 0.1 mm high (2.5 from the axis), rows 0.8–2.8 from the centre and 2 mm before the lip", async () => {
    const { geometry } = await exportPin(params({ sideA: FRIC1, sideB: FRIC1 }));
    const m = measurePin(geometry);
    expect(m.xPlanes).toEqual([-8, -7.2, -5.2, -4.6, -2.8, -0.8, 0.8, 2.8, 4.6, 5.2, 7.2, 8]);
    // Ribs at 45°: their tops face outwards 2.5 mm from the axis, their sides are
    // 0.3 mm either side of the rib's centre line (0.6 wide); both face diagonally.
    const diagonal = geometry.planes.filter(
      (p) =>
        Math.abs(p.normal[0]) < 1e-9 &&
        r3(Math.abs(p.normal[1])) === r3(Math.SQRT1_2) &&
        r3(Math.abs(p.normal[2])) === r3(Math.SQRT1_2),
    );
    const distances = new Set(diagonal.map((p) => r3(Math.abs(p.origin[1] * p.normal[1] + p.origin[2] * p.normal[2]))));
    expect([...distances].sort((a, b) => a - b)).toEqual([0.3, 2.5]);
  });

  it("3L pin: the long side reaches 16 mm", async () => {
    const m = measurePin((await exportPin(params({ sideB: PIN2 }))).geometry);
    expect(m.xPlanes).toEqual([-8, -7.2, -4.6, -0.8, 0.8, 12.6, 15.2, 16]);
  });

  it("axle pin: one 0.8 mm collar with its back face at the centre, axle to 7.8, bore blind at the collar", async () => {
    const { step, geometry } = await exportPin(params({ sideB: AXLE1 }));
    const m = measurePin(geometry);
    expect(solids(step)).toBe(1);
    // -0.8: collar face and bore floor; 0: collar back face; 7.8: bevelled axle end.
    expect(m.xPlanes).toEqual([-8, -7.2, -4.6, -0.8, 0, 7.8]);
    expect(m.radii).toEqual([1.6, 2.4, 2.6, 3]);
  });

  it("half pin: a 1.6 mm open stud on the back of the collar, bore through", async () => {
    const m = measurePin((await exportPin(params({ sideB: STUD }))).geometry);
    expect(m.xPlanes).toEqual([-8, -7.2, -4.6, -0.8, 0, 1.6]);
  });

  it("plain ends: no lip or slots", async () => {
    const m = measurePin((await exportPin(params({ ends: PLAIN }))).geometry);
    expect(m.xPlanes).toEqual([-8, -0.8, 0.8, 8]);
    expect(m.radii).toEqual([1.6, 2.4, 3]);
  });

  it("pin diameter changes shaft and lip, collar diameter the collar, axle size the cross", async () => {
    const clearance = { ...NO_CLEARANCE, pin: -0.1, collar: 0.1, axle: -0.2 };
    const { geometry } = await exportPin(params({ sideB: AXLE1 }), clearance);
    expect(measurePin(geometry).radii).toEqual([1.6, 2.3, 2.35, 2.55, 3.05]); // cross tips 2.3, shaft 2.35, lip 2.55
  });
});
