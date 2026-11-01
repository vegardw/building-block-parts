// Its own file, so it starts with a fresh engine (100 MB of memory), like memory.test.ts.
import "./openCascade";
import { describe, it, expect } from "vitest";
import { getOC } from "replicad";
import { buildPart } from "../src/parts/builders";
import { NO_CLEARANCE } from "../src/spec";

const heapMB = () => getOC().wasmMemory.buffer.byteLength / 1048576;

// Bricks, plates and bricks with holes are two or three booleans whatever their
// size. Ten builds each of these common sizes end at about 163 MB (measured), about
// 1.5 MB a build; in the same engine after the longest underside bar, whose builds
// fragment the heap, they reached 344 MB, so they get an engine of their own here.
describe("engine memory, bricks and plates", () => {
  it("stays low over ten builds each of common bricks, plates and bricks with holes", () => {
    const parts = [
      { partId: "brick", params: { width: 2, length: 4 } },
      { partId: "brick", params: { width: 1, length: 16 } },
      { partId: "plate", params: { width: 4, length: 4 } },
      { partId: "brick-with-holes", params: { length: 16 } },
    ];
    for (const { partId, params } of parts) {
      for (let i = 0; i < 10; i++) buildPart({ partId, params, clearance: NO_CLEARANCE }).delete();
    }
    expect(heapMB()).toBeLessThan(256);
  });
});
