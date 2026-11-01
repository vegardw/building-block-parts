import { describe, it, expect } from "vitest";
import {
  readClearance,
  formatClearance,
  clearanceTextFrom,
  clearanceCounts,
  type ClearanceText,
} from "../src/clearance";
import { NO_CLEARANCE } from "../src/spec";

const text = (t: Partial<ClearanceText>): ClearanceText => ({
  hole: "0",
  width: "0",
  height: "0",
  axle: "0",
  pin: "0",
  collar: "0",
  ...t,
});
const BEAM = ["hole", "width", "height"] as const;

describe("formatClearance", () => {
  it.each([
    [0.2, "+0.20"],
    [-0.1, "−0.10"], // typographic minus
    [0, "0.00"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatClearance(value)).toBe(expected);
  });
});

describe("readClearance", () => {
  it("reads nominal clearance with no adjustments", () => {
    const s = readClearance(text({ width: "0,0", height: " 0 " }));
    expect(s.clearance).toEqual({ ...NO_CLEARANCE });
    expect(s.invalid).toEqual([]);
    expect(s.problem).toBeNull();
    expect(s.adjustments).toEqual([]);
  });

  it("lists every non-zero value in field order", () => {
    const s = readClearance(text({ hole: "0,2", height: "−0.1", axle: "-0.05" }));
    expect(s.clearance).toEqual({ ...NO_CLEARANCE, hole: 0.2, height: -0.1, axle: -0.05 });
    expect(s.adjustments).toEqual(["Hole diameter +0.20 mm", "Beam height −0.10 mm", "Axle size −0.05 mm"]);
  });

  it("names the invalid fields: unparsable, empty or beyond ±1 mm", () => {
    const s = readClearance(text({ hole: "abc", width: "", height: "1.5" }), BEAM);
    expect(s.clearance).toBeNull();
    expect(s.invalid).toEqual(["hole", "width", "height"]);
    expect(s.problem).toBe("Clearance for hole diameter, beam width and beam height must be a number from −1 to 1 mm.");
    expect(s.adjustments).toEqual([]);
  });

  it("accepts the limits themselves", () => {
    const s = readClearance(text({ hole: "1", width: "-1", axle: "0,5" }));
    expect(s.invalid).toEqual([]);
    expect(s.clearance).toEqual({ ...NO_CLEARANCE, hole: 1, width: -1, axle: 0.5 });
  });

  it("limits the axle size to ±0.5 mm, in its own sentence", () => {
    const s = readClearance(text({ hole: "x", axle: "0.6" }));
    expect(s.invalid).toEqual(["hole", "axle"]);
    expect(s.problem).toBe(
      "Clearance for hole diameter must be a number from −1 to 1 mm. Clearance for axle size must be a number from −0.5 to 0.5 mm.",
    );
  });

  it("limits the collar diameter to ±0.5 mm and lists it after the axle size", () => {
    const s = readClearance(text({ axle: "-0.05", collar: "-0,1" }), ["axle", "collar"]);
    expect(s.clearance).toEqual({ ...NO_CLEARANCE, axle: -0.05, collar: -0.1 });
    expect(s.adjustments).toEqual(["Axle size −0.05 mm", "Collar diameter −0.10 mm"]);
    expect(readClearance(text({ collar: "0.6" }), ["collar"]).problem).toBe(
      "Clearance for collar diameter must be a number from −0.5 to 0.5 mm.",
    );
  });

  it("marks only the bad field", () => {
    const s = readClearance(text({ hole: "0.1", width: "-" }), BEAM);
    expect(s.invalid).toEqual(["width"]);
    expect(s.problem).toMatch(/^Clearance for beam width must be/);
  });

  // A part only reads its own fields: the others count as 0 and can't block it.
  it("ignores fields the part doesn't use", () => {
    const axle = readClearance(text({ hole: "abc", width: "0.3", axle: "-0.1" }), ["axle"]);
    expect(axle.problem).toBeNull();
    expect(axle.clearance).toEqual({ ...NO_CLEARANCE, axle: -0.1 });
    expect(axle.adjustments).toEqual(["Axle size −0.10 mm"]);

    const beam = readClearance(text({ axle: "nonsense", hole: "0.2" }), BEAM);
    expect(beam.problem).toBeNull();
    expect(beam.clearance).toEqual({ ...NO_CLEARANCE, hole: 0.2 });

    const none = readClearance(text({ hole: "abc" }), []);
    expect(none.clearance).toEqual({ ...NO_CLEARANCE });
    expect(none.adjustments).toEqual([]);
  });
});

// The header's button: one invalid value must not hide the values in use.
describe("clearanceCounts", () => {
  it("counts the values that aren't zero, and the invalid ones separately", () => {
    expect(clearanceCounts(text({}))).toEqual({ adjusted: 0, invalid: 0 });
    expect(clearanceCounts(text({ hole: "0,2", width: "-0.05" }))).toEqual({ adjusted: 2, invalid: 0 });
    expect(clearanceCounts(text({ hole: "0.2", width: "-0.05", pin: "abc" }))).toEqual({ adjusted: 2, invalid: 1 });
    expect(clearanceCounts(text({ axle: "0.6", collar: "-" }))).toEqual({ adjusted: 0, invalid: 2 }); // beyond ±0.5, half typed
  });
});

describe("clearanceTextFrom (saved settings)", () => {
  it("keeps data saved before the axle and collar fields existed, adding them at 0", () => {
    expect(clearanceTextFrom({ hole: "0,2", width: "-0.1", height: "0" })).toEqual(
      text({ hole: "0,2", width: "-0.1" }),
    );
  });

  it("falls back to nominal for missing, broken or non-text data", () => {
    expect(clearanceTextFrom(null)).toEqual(text({}));
    expect(clearanceTextFrom("junk")).toEqual(text({}));
    expect(clearanceTextFrom({ hole: 0.2, axle: "-0.1" })).toEqual(text({ axle: "-0.1" }));
  });
});
