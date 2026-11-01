import { describe, it, expect } from "vitest";
import { as3D } from "../src/parts/shapes";

describe("as3D", () => {
  it("returns shapes that can be fused and cut", () => {
    const solid = { fuse: () => null, cut: () => null };
    expect(as3D(solid)).toBe(solid);
  });

  it("rejects shapes that are not 3D (edges, faces, ...)", () => {
    expect(() => as3D({ length: 3 })).toThrow("Expected a 3D shape");
  });
});
