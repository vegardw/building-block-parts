import { describe, it, expect } from "vitest";
import { readHash, partHash, stepHash, dimensionsHash, type Doc } from "../src/route";

const route = (
  view: string | null,
  id: string | null = null,
  query: Record<string, string> | null = null,
  doc: Doc | null = null,
) => ({
  view,
  id,
  query,
  doc,
});

describe("readHash", () => {
  it.each([
    ["", route("parts")],
    ["#parts", route("parts")],
    ["#parts/", route("parts")], // an empty id is no id
    ["#parts/pin", route("parts", "pin")],
    ["#parts/beam?holes=7&height=1", route("parts", "beam", { holes: "7", height: "1" })],
    ["#calibrate", route("calibrate")],
    ["#calibrate/axle", route("calibrate", "axle")],
    ["#calibrate/hole?centre=-0.1", route("calibrate", "hole", { centre: "-0.1" })],
    ["#calibration", route("calibrate")], // the guide's old address
    ["#guide", route(null, null, null, { kind: "guide" })], // over the current section
    ["#dimensions", route(null, null, null, { kind: "dimensions", section: null })],
    ["#dimensions/", route(null, null, null, { kind: "dimensions", section: null })],
    ["#dimensions/pin", route(null, null, null, { kind: "dimensions", section: "pin" })],
    ["#something-else", route(null)],
    ["#something/else?x=1", route(null)],
  ])("%j", (hash, expected) => {
    expect(readHash(hash)).toEqual(expected);
  });

  it("reads back the addresses it gives, parameters included", () => {
    expect(readHash(partHash("axle"))).toEqual(route("parts", "axle"));
    expect(readHash(stepHash("size"))).toEqual(route("calibrate", "size"));
    expect(partHash("beam", { holes: 7, height: 0 })).toBe("#parts/beam?holes=7&height=0");
    expect(readHash(dimensionsHash()).doc).toEqual({ kind: "dimensions", section: null });
    expect(readHash(dimensionsHash("brick")).doc).toEqual({ kind: "dimensions", section: "brick" });
    expect(readHash(stepHash("hole", { perSide: 4, step: 0.05, centre: -0.1 }))).toEqual(
      route("calibrate", "hole", { perSide: "4", step: "0.05", centre: "-0.1" }),
    );
  });
});
