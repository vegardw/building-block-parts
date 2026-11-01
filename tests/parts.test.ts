import { describe, it, expect } from "vitest";
import {
  PARTS,
  REGULAR_PARTS,
  requirePart,
  defaultText,
  parseParams,
  validatePart,
  paramProblem,
  settingsUsed,
} from "../src/parts/index";
import { BUILDERS } from "../src/parts/builders";
import { NO_CLEARANCE, CLEARANCE_FIELDS, type Clearance } from "../src/spec";

describe("part registry", () => {
  it("has unique ids and a builder for every part", () => {
    const ids = PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(BUILDERS[id], `builder for ${id}`).toBeTypeOf("function");
  });

  it("gives each part its own file name", () => {
    expect(requirePart("beam").filename({ holes: 5, height: 0 })).toBe("beam-5-holes");
    // The half-height beam keeps the file name it had as a part of its own.
    expect(requirePart("beam").filename({ holes: 5, height: 1 })).toBe("half-beam-5-holes");
  });

  it.each(PARTS.map((p) => p.id))("%s: default parameters are valid", (id) => {
    const part = requirePart(id);
    const params = parseParams(part, defaultText(part));
    expect(validatePart(part, params, NO_CLEARANCE)).toBeNull();
  });

  // Every choice of every part (one choice at a time from the defaults): the settings
  // it uses are always some of those it lists, in their order.
  it.each(PARTS.map((p) => p.id))("%s: the settings used are among its clearance list", (id) => {
    const part = requirePart(id);
    const defaults = parseParams(part, defaultText(part));
    const variants = [defaults];
    for (const def of part.params) {
      if (def.type === "choice") for (const o of def.options) variants.push({ ...defaults, [def.key]: o.value });
    }
    for (const params of variants) {
      const used = settingsUsed(part, params);
      expect(
        part.clearance.filter((k) => used.includes(k)),
        JSON.stringify(params),
      ).toEqual([...used]);
    }
  });
});

describe("beam validation", () => {
  const beam = requirePart("beam");
  const check = (holes: number, clearance: Clearance = NO_CLEARANCE, height = 0) =>
    validatePart(beam, { holes, height }, clearance);

  it("accepts nominal dimensions", () => expect(check(3)).toBeNull());

  it("rejects hole counts outside 2..32 and non-integers", () => {
    for (const holes of [0, 1, 33, 2.5, NaN]) expect(check(holes)).toMatch(/whole number from 2 to 32/);
  });

  it("rejects a counterbore wall that is too thin", () => {
    expect(check(3, { ...NO_CLEARANCE, hole: 0.5, width: -0.2 })).toMatch(/wall/);
  });

  it("rejects out-of-range clearance values", () => {
    expect(check(3, { ...NO_CLEARANCE, hole: 2 })).toBe("Hole diameter clearance must be a number from −1 to 1 mm.");
  });

  it("names the parameter out of range, for the message under its field", () => {
    expect(paramProblem(beam, { holes: 33, height: 0 })).toEqual({
      key: "holes",
      message: "Length (number of holes) must be a whole number from 2 to 32.",
    });
    expect(paramProblem(beam, { holes: 3, height: 5 })).toEqual({
      key: "height",
      message: "Choose a value for Height.",
    });
    // Negative limits with the typographic minus the app shows elsewhere.
    expect(paramProblem(requirePart("calibration"), { perSide: 4, step: 0.05, centre: -0.7 })).toEqual({
      key: "centre",
      message: "Middle value (mm) must be a number from −0.6 to 0.6.",
    });
    // A missing parameter (e.g. from old saved data) is invalid like a wrong one.
    expect(paramProblem(beam, { holes: 3 })).toEqual({ key: "height", message: "Choose a value for Height." });
    expect(paramProblem(beam, { height: 0 })).toEqual({
      key: "holes",
      message: "Length (number of holes) must be a whole number from 2 to 32.",
    });
    // Valid parameters: a problem from elsewhere (here the counterbore wall) isn't tied to one of them.
    expect(paramProblem(beam, { holes: 3, height: 0 })).toBeNull();
    expect(check(3, { ...NO_CLEARANCE, hole: 0.5, width: -0.2 })).toMatch(/wall/);
  });

  it("is full or half height, nothing else", () => {
    expect(check(3, NO_CLEARANCE, 1)).toBeNull();
    expect(check(3, NO_CLEARANCE, 2)).toMatch(/Choose a value for Height/);
  });

  // 4 mm minus 1 mm is still above the two 0.8 mm counterbores; the check is the same for both heights.
  it("checks the half-height beam's thickness against its counterbores", () => {
    expect(check(3, { ...NO_CLEARANCE, height: -1 }, 1)).toBeNull();
  });
});

describe("calibration parts", () => {
  const calibration = PARTS.filter((p) => p.calibration);

  it("are listed under Calibrate, not under Parts", () => {
    expect(calibration.map((p) => p.id).sort()).toEqual([
      "axle-calibration",
      "calibration",
      "collar-calibration",
      "pin-calibration",
      "stud-calibration",
      "underside-calibration",
    ]);
    expect(REGULAR_PARTS.map((p) => p.id)).toEqual(["beam", "axle", "pin", "brick", "brick-with-holes", "plate"]);
  });

  it.each(calibration.map((p) => p.id))("%s finds a fit setting and uses none", (id) => {
    const part = requirePart(id);
    expect(CLEARANCE_FIELDS.map((f) => f.key)).toContain(part.calibration!.setting);
    expect(part.clearance).toEqual([]);
    expect(part.params.map((p) => p.key)).toEqual(["perSide", "step", "centre"]);
  });
});
