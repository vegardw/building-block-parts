import { describe, it, expect } from "vitest";
import {
  isoDate,
  originsFrom,
  typeFitValue,
  calibratedFitValue,
  fieldStatus,
  fitToFile,
  fitFromFile,
  NOMINAL_FIT,
  FIT_FILE_FORMAT,
  type Fit,
} from "../src/fit";
import { clearanceTextFrom } from "../src/clearance";

const fit = (text: Record<string, string> = {}, origins: Fit["origins"] = {}): Fit => ({
  text: { ...clearanceTextFrom(null), ...text },
  origins,
});

describe("isoDate", () => {
  it("gives the local date as YYYY-MM-DD", () => {
    expect(isoDate(new Date(2026, 9, 31, 23, 59))).toBe("2026-10-31");
    expect(isoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("changing a value", () => {
  it("records a typed value as set by hand, keeping the text as typed", () => {
    const f = typeFitValue(NOMINAL_FIT, "hole", "0,1", "2026-10-31");
    expect(f.text.hole).toBe("0,1");
    expect(f.origins.hole).toEqual({ by: "hand", date: "2026-10-31" });
    expect(NOMINAL_FIT.text.hole).toBe("0"); // not changed in place
  });

  it("records a calibrated value as plain text, rounded to 4 decimals", () => {
    const f = calibratedFitValue(NOMINAL_FIT, "axle", -0.15000000000000002, "2026-10-31");
    expect(f.text.axle).toBe("-0.15");
    expect(f.origins.axle).toEqual({ by: "calibration", date: "2026-10-31" });
  });
});

describe("fieldStatus", () => {
  it("tells calibrated, set by hand and never set apart", () => {
    const f = fit(
      { hole: "0.1", width: "-0.05", pin: "0.2" },
      { hole: { by: "calibration", date: "2026-10-30" }, width: { by: "hand", date: "2026-10-31" } },
    );
    expect(fieldStatus(f, "hole")).toEqual({ kind: "calibrated", date: "2026-10-30" });
    expect(fieldStatus(f, "width")).toEqual({ kind: "hand", date: "2026-10-31" });
    // Saved before origins were kept: a non-zero value was typed by hand.
    expect(fieldStatus(f, "pin")).toEqual({ kind: "hand" });
    expect(fieldStatus(f, "collar")).toEqual({ kind: "none" });
  });

  it("counts a calibrated 0 as calibrated", () => {
    const f = calibratedFitValue(NOMINAL_FIT, "collar", 0, "2026-10-31");
    expect(fieldStatus(f, "collar").kind).toBe("calibrated");
  });
});

describe("originsFrom (saved data)", () => {
  it("keeps valid origins and drops anything else", () => {
    expect(
      originsFrom({
        hole: { by: "calibration", date: "2026-10-31" },
        width: { by: "guess", date: "2026-10-31" },
        height: { by: "hand", date: "yesterday" },
        nonsense: { by: "hand", date: "2026-10-31" },
      }),
    ).toEqual({ hole: { by: "calibration", date: "2026-10-31" } });
    expect(originsFrom(null)).toEqual({});
    expect(originsFrom("junk")).toEqual({});
  });
});

describe("fit settings file", () => {
  const saved = fit(
    { hole: "0,1", axle: "-0.05" },
    { hole: { by: "calibration", date: "2026-10-30" }, axle: { by: "hand", date: "2026-10-31" } },
  );

  it("writes every value as a number in mm, with its origin", () => {
    const file = fitToFile(saved, "2026-10-31");
    if (!("text" in file)) throw new Error(file.error);
    expect(JSON.parse(file.text)).toEqual({
      format: FIT_FILE_FORMAT,
      version: 1,
      saved: "2026-10-31",
      unit: "mm",
      settings: {
        hole: { value: 0.1, origin: "calibration", date: "2026-10-30" },
        width: { value: 0 },
        height: { value: 0 },
        axle: { value: -0.05, origin: "hand", date: "2026-10-31" },
        pin: { value: 0 },
        collar: { value: 0 },
        stud: { value: 0 },
        underside: { value: 0 },
      },
    });
  });

  it("reads back what it wrote", () => {
    const file = fitToFile(saved, "2026-10-31");
    if (!("text" in file)) throw new Error(file.error);
    const loaded = fitFromFile(file.text);
    if (!("fit" in loaded)) throw new Error(loaded.error);
    expect(loaded.fit).toEqual(fit({ hole: "0.1", axle: "-0.05" }, saved.origins));
  });

  it("refuses to save a value that isn't valid", () => {
    expect(fitToFile(fit({ width: "abc" }), "2026-10-31")).toEqual({
      error: "Clearance for part width must be a number from −1 to 1 mm. Correct it before saving.",
    });
  });

  it("sets values missing from a file to 0 and ignores unknown keys", () => {
    const text = JSON.stringify({
      format: FIT_FILE_FORMAT,
      version: 2,
      settings: { hole: { value: 0.2 }, glow: { value: 3 } },
    });
    const loaded = fitFromFile(text);
    expect(loaded).toEqual({ fit: fit({ hole: "0.2" }) });
  });

  // Files saved before the stud and underside settings existed have six values.
  it("loads a file from before the stud and underside settings, with those at 0", () => {
    const old = { value: 0.1, origin: "calibration", date: "2026-10-30" };
    const six = { hole: old, width: old, height: old, axle: old, pin: old, collar: old };
    const loaded = fitFromFile(JSON.stringify({ format: FIT_FILE_FORMAT, version: 1, settings: six }));
    if (!("fit" in loaded)) throw new Error(loaded.error);
    expect(loaded.fit.text.stud).toBe("0");
    expect(loaded.fit.text.underside).toBe("0");
    expect(loaded.fit.text.collar).toBe("0.1");
    expect(loaded.fit.origins.stud).toBeUndefined();
  });

  it("drops a malformed origin but keeps the value", () => {
    const text = JSON.stringify({
      format: FIT_FILE_FORMAT,
      settings: { pin: { value: 0.1, origin: "magic", date: "2026-10-31" } },
    });
    expect(fitFromFile(text)).toEqual({ fit: fit({ pin: "0.1" }) });
  });

  // A file written by hand: whatever is loaded must be valid text in the fields.
  it("loads a tiny value as 0 and one a hair beyond its limit as the limit", () => {
    const text = JSON.stringify({
      format: FIT_FILE_FORMAT,
      settings: { hole: { value: 1e-7 }, width: { value: -1.0000000001 }, pin: { value: -2e-7 } },
    });
    expect(fitFromFile(text)).toEqual({ fit: fit({ width: "-1" }) });
  });

  it.each([
    ["not JSON", "{ hole: 0.1", /can't be read as JSON/],
    ["another kind of file", JSON.stringify({ hole: 0.1 }), /isn't a fit settings file/],
    [
      "a value as text",
      JSON.stringify({ format: FIT_FILE_FORMAT, settings: { hole: { value: "0.1" } } }),
      /^Hole diameter in this file must be a number/,
    ],
    [
      "a value beyond its limit",
      JSON.stringify({ format: FIT_FILE_FORMAT, settings: { axle: { value: 0.6 } } }),
      /^Axle size in this file must be a number from −0.5 to 0.5 mm/,
    ],
    [
      "a value just beyond its limit",
      JSON.stringify({ format: FIT_FILE_FORMAT, settings: { collar: { value: 0.500001 } } }),
      /^Collar diameter in this file/,
    ],
  ])("rejects %s and changes nothing", (_name, text, message) => {
    const loaded = fitFromFile(text);
    expect("error" in loaded && loaded.error).toMatch(message);
  });
});
