import { describe, it, expect } from "vitest";
import { settingsFrom, paramsFromAddress } from "../src/settings";
import { DEFAULT_PART, REGULAR_PARTS, requirePart } from "../src/parts/index";

describe("settingsFrom (saved settings)", () => {
  it("starts with the first part, the first step and default parameters", () => {
    expect(REGULAR_PARTS[0]).toBe(DEFAULT_PART);
    const s = settingsFrom(null);
    expect(s.partId).toBe(DEFAULT_PART.id);
    expect(s.stepId).toBe("hole");
    expect(s.paramText.beam).toEqual({ holes: "3", height: "0" });
    expect(s.paramText.calibration).toEqual({ perSide: "4", step: "0.05", centre: "0" });
  });

  it("keeps a saved part, step and parameters as typed", () => {
    const s = settingsFrom({
      partId: "axle",
      stepId: "collar",
      paramText: { beam: { holes: "7" }, calibration: { step: "0,03" } },
    });
    expect(s.partId).toBe("axle");
    expect(s.stepId).toBe("collar");
    expect(s.paramText.beam).toEqual({ holes: "7", height: "0" }); // saved before the height choice: full
    // Saved before the middle value existed: it starts at 0.
    expect(s.paramText.calibration).toEqual({ perSide: "4", step: "0,03", centre: "0" });
  });

  it("opens a selected half-height beam, once a part of its own, as a half-height beam", () => {
    const s = settingsFrom({ partId: "half-beam", paramText: { beam: { holes: "9" }, "half-beam": { holes: "5" } } });
    expect(s.partId).toBe("beam");
    expect(s.paramText.beam).toEqual({ holes: "5", height: "1" });
  });

  it("keeps a full beam's settings when the half-height beam wasn't selected", () => {
    const s = settingsFrom({ partId: "beam", paramText: { beam: { holes: "9" }, "half-beam": { holes: "5" } } });
    expect(s.paramText.beam).toEqual({ holes: "9", height: "0" });
  });

  it("opens the step of a calibration part that was saved as the selected part", () => {
    const s = settingsFrom({ partId: "collar-calibration" });
    expect(s.partId).toBe(DEFAULT_PART.id);
    expect(s.stepId).toBe("collar");
  });

  it("falls back to defaults for unknown or invalid data", () => {
    const s = settingsFrom({ partId: "spaceship", stepId: "warp", paramText: { beam: { holes: "300" }, pin: "junk" } });
    expect(s.partId).toBe(DEFAULT_PART.id);
    expect(s.stepId).toBe("hole");
    expect(s.paramText.beam).toEqual({ holes: "3", height: "0" });
    expect(settingsFrom("junk").partId).toBe(DEFAULT_PART.id);
  });

  it("remembers the file type, STEP unless STL was chosen", () => {
    expect(settingsFrom(null).format).toBe("step");
    expect(settingsFrom({ format: "stl" }).format).toBe("stl");
    expect(settingsFrom({ format: "obj" }).format).toBe("step");
  });
});

describe("paramsFromAddress (a link like #parts/beam?holes=7)", () => {
  const beam = requirePart("beam");
  const current = { holes: "3", height: "0" };

  it("takes the parameters the address names and keeps the others", () => {
    expect(paramsFromAddress(beam, { holes: "7" }, current)).toEqual({ holes: "7", height: "0" });
    expect(paramsFromAddress(beam, { holes: "7", height: "1", colour: "red" }, current)).toEqual({
      holes: "7",
      height: "1",
    });
  });

  it("ignores an address without parameters or with an invalid part", () => {
    expect(paramsFromAddress(beam, null, current)).toBeNull();
    expect(paramsFromAddress(beam, { colour: "red" }, current)).toBeNull();
    expect(paramsFromAddress(beam, { holes: "300" }, current)).toBeNull();
    expect(
      paramsFromAddress(requirePart("pin"), { sideA: "4", sideB: "4" }, { sideA: "0", sideB: "0", ends: "0" }),
    ).toBeNull(); // no pin side
  });
});
