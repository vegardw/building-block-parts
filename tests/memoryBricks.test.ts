// Its own file, so it starts with a fresh engine (100 MB of memory), like memory.test.ts.
import "./openCascade";
import { describe, it, expect } from "vitest";
import { getOC } from "replicad";
import { buildPart } from "../src/parts/builders";
import { NO_CLEARANCE } from "../src/spec";

const heapMB = () => getOC().wasmMemory.buffer.byteLength / 1048576;

// The underside calibration bar is one boolean, but its longest (15 sections) has
// about 600 faces, and the engine keeps about 6 MB of each build (measured). It
// cuts every section's cavity, drawn with its ribs and tube left out, from the
// solid bar: fusing a box per rib instead kept about 30 MB per build, and building
// it from extrusions joined in one fuse kept more than cutting.
describe("engine memory, brick calibration bars", () => {
  it("stays low over ten builds each of the longest stud and underside bars", () => {
    for (const partId of ["stud-calibration", "underside-calibration"]) {
      const params = { perSide: 7, step: 0.05, centre: 0 };
      for (let i = 0; i < 10; i++) buildPart({ partId, params, clearance: NO_CLEARANCE }).delete();
    }
    expect(heapMB()).toBeLessThan(256);
  });
});
