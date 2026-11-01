// Its own file, so it starts with a fresh engine (100 MB of memory).
import "./openCascade";
import { describe, it, expect } from "vitest";
import { getOC } from "replicad";
import { buildPart } from "../src/parts/builders";
import { NO_CLEARANCE } from "../src/spec";

const heapMB = () => getOC().wasmMemory.buffer.byteLength / 1048576;

// The engine keeps a little memory after every boolean, and the heap never
// shrinks (docs/architecture.md, "Memory"). The builders keep the number of booleans low:
// the parts that used to grow the heap most stay well within the limit at which
// the page would replace the worker. When it still joined its sections one by one,
// the calibration axle alone took the heap to 287 MB in ten builds.
describe("engine memory", () => {
  it("stays low over ten builds each of the parts with the most booleans", () => {
    const largest = [
      { partId: "pin", params: { sideA: 3, sideB: 3, ends: 0 } }, // friction pin, 2 + 2 studs
      { partId: "calibration", params: { perSide: 7, step: 0.05, centre: 0 } },
      { partId: "axle-calibration", params: { perSide: 7, step: 0.05, centre: 0 } },
      { partId: "pin-calibration", params: { perSide: 7, step: 0.05, centre: 0 } },
    ];
    for (const { partId, params } of largest) {
      for (let i = 0; i < 10; i++) buildPart({ partId, params, clearance: NO_CLEARANCE }).delete();
    }
    expect(heapMB()).toBeLessThan(256);
  });
});
