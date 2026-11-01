import "./openCascade";
import { describe, it, expect } from "vitest";
import { makeBox, makeCylinder, measureVolume } from "replicad";
import { cutAll, fuseAll } from "../src/parts/booleans.build";
import { analyseStep } from "./stepStats";

const solids = async (shape: { blobSTEP(): Blob }) =>
  ((await shape.blobSTEP().text()).match(/MANIFOLD_SOLID_BREP/g) ?? []).length;

describe("fuseAll and cutAll", () => {
  it("join pieces that overlap each other, not only the first, into one solid", async () => {
    // Three 2 mm cubes in a row, each overlapping the next by 1 mm: 2 + 1 + 1 = 4 mm long.
    const cube = (x: number) => makeBox([x, 0, 0], [x + 2, 2, 2]);
    const joined = fuseAll([cube(0), cube(1), cube(2)]);
    expect(await solids(joined)).toBe(1);
    expect(measureVolume(joined)).toBeCloseTo(16, 6);
    expect(analyseStep(await joined.blobSTEP().text()).faceTypes).toEqual({ PLANE: 6 }); // faces merged again
  });

  it("cut tools that overlap each other: a bore and its counterbore", async () => {
    const block = makeBox([-5, -5, 0], [5, 5, 10]);
    const bore = makeCylinder(1, 12, [0, 0, -1], [0, 0, 1]);
    const counterbore = makeCylinder(2, 3, [0, 0, 8], [0, 0, 1]); // overlaps the bore
    const cut = cutAll([block, bore, counterbore]);
    expect(await solids(cut)).toBe(1);
    expect(measureVolume(cut)).toBeCloseTo(1000 - Math.PI * (1 * 8 + 4 * 2), 4);
  });

  it("give back a single shape unchanged", () => {
    const cube = makeBox([0, 0, 0], [1, 1, 1]);
    expect(fuseAll([cube])).toBe(cube);
    expect(cutAll([cube])).toBe(cube);
  });
});
