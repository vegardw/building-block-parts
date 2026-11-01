import { describe, it, expect } from "vitest";
import { binaryStl } from "../src/stl";
import { analyseStl } from "./stlStats";

// A unit tetrahedron, its triangles counter-clockwise seen from outside: volume 1/6.
const TETRA = {
  vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  triangles: [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3],
};

const floats = (buffer: ArrayBuffer, at: number, n: number) =>
  Array.from({ length: n }, (_, i) => new DataView(buffer).getFloat32(at + 4 * i, true));

describe("binaryStl", () => {
  it("writes a binary STL header that readers won't take for a text STL", () => {
    const buffer = binaryStl([{ ...TETRA, offsets: [[0, 0, 0]] }]);
    const header = new TextDecoder().decode(new Uint8Array(buffer, 0, 80));
    expect(header.startsWith("solid")).toBe(false);
    expect(new DataView(buffer).getUint32(80, true)).toBe(4);
    expect(buffer.byteLength).toBe(84 + 4 * 50);
  });

  it("writes each triangle's unit normal, its corners and a zero attribute", () => {
    const buffer = binaryStl([{ ...TETRA, offsets: [[0, 0, 0]] }]);
    expect(floats(buffer, 84, 12)).toEqual([0, 0, -1, 0, 0, 0, 0, 1, 0, 1, 0, 0]); // the bottom face, facing down
    expect(new DataView(buffer).getUint16(84 + 48, true)).toBe(0);
    const slanted = floats(buffer, 84 + 3 * 50, 3); // the face x + y + z = 1
    for (const n of slanted) expect(n).toBeCloseTo(1 / Math.sqrt(3), 6);
  });

  it("writes the mesh once per copy, shifted", () => {
    const s = analyseStl(
      binaryStl([
        {
          ...TETRA,
          offsets: [
            [0, 0, 0],
            [10, 0, 0],
            [0, 20, 5],
          ],
        },
      ]),
    );
    expect(s.triangles).toBe(12);
    expect(s.min).toEqual([0, 0, 0]);
    expect(s.max).toEqual([11, 21, 6]);
    expect(s.volume).toBeCloseTo(3 / 6, 6); // outward-facing in every copy
  });

  it("writes several meshes, and none for a part without copies", () => {
    const s = analyseStl(
      binaryStl([
        { ...TETRA, offsets: [[0, 0, 0]] },
        { ...TETRA, offsets: [] },
        { vertices: [0, 0, 0, 2, 0, 0, 0, 2, 0], triangles: [0, 1, 2], offsets: [[0, 0, 3]] },
      ]),
    );
    expect(s.triangles).toBe(5);
    expect(s.area).toBeCloseTo(3 * 0.5 + Math.sqrt(3) / 2 + 2, 6);
  });

  it("gives a degenerate triangle a zero normal, not NaN", () => {
    const buffer = binaryStl([{ vertices: [0, 0, 0, 1, 1, 1, 2, 2, 2], triangles: [0, 1, 2], offsets: [[0, 0, 0]] }]);
    expect(floats(buffer, 84, 3)).toEqual([0, 0, 0]);
  });
});
