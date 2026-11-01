import "./openCascade";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildPart } from "../src/parts/builders";
import { NO_CLEARANCE, type Clearance } from "../src/spec";
import { analyseStep, stepGeometry } from "./stepStats";

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

const build = ({ holes, clearance }: { holes: number; clearance: Clearance }) =>
  buildPart({ partId: "beam", params: { holes, height: 0 }, clearance });

const stepOf = (args: { holes: number; clearance: Clearance }) => build(args).blobSTEP().text();

// ---- 1. The analyser itself, checked against known reference files --------
// Two small synthetic files, not written by our generator: a Ø4.8 × 8 mm cylinder
// with exact surfaces (one circle and the seam wrapped in SURFACE_CURVE and
// SEAM_CURVE, as some exporters write them), and the same cylinder made of six flat
// sides, the kind of faceted file this project exists to avoid. Both open in
// OpenCascade as valid solids of the right volume.
describe("STEP analyser on reference files", () => {
  const exact = readFileSync(fixture("analytic-cylinder.step"), "utf8");
  const faceted = readFileSync(fixture("faceted-cylinder.step"), "utf8");

  it("exact cylinder: 2 planes and a cylinder, circles and a line, looking through curve wrappers", () => {
    const s = analyseStep(exact);
    expect(s.faceTypes).toEqual({ PLANE: 2, CYLINDRICAL_SURFACE: 1 });
    expect(s.edgeTypes).toEqual({ CIRCLE: 2, LINE: 1 });
  });

  it("exact cylinder: surfaces, positions and millimetres", () => {
    const g = stepGeometry(exact);
    expect(g.millimetres).toBe(true);
    expect(g.cylinders).toEqual([{ origin: [0, 0, 0], axis: [0, 0, 1], radius: 2.4 }]);
    expect(g.planes.map((p) => p.origin[2]).sort()).toEqual([0, 8]);
  });

  it("faceted cylinder: flat faces and lines only", () => {
    const s = analyseStep(faceted);
    expect(s.faceTypes).toEqual({ PLANE: 8 });
    expect(s.edgeTypes).toEqual({ LINE: 18 });
    expect(stepGeometry(faceted).cylinders).toEqual([]);
  });
});

// ---- 2. Our generator: true curves must survive STEP export ---------------
const cases = [2, 3, 5, 16];

describe("beam STEP export keeps true curves", () => {
  it.each(cases)("%i holes: only planes/cylinders and lines/circles", async (holes) => {
    const s = analyseStep(await stepOf({ holes, clearance: NO_CLEARANCE }));
    expect(Object.keys(s.faceTypes).sort()).toEqual(["CYLINDRICAL_SURFACE", "PLANE"]);
    expect(Object.keys(s.edgeTypes).sort()).toEqual(["CIRCLE", "LINE"]);
  });

  // Expected counts follow from the geometry: 2 flat sides, top and bottom,
  // and a counterbore floor on each face per hole (4 + 2n planes); two rounded
  // ends, one bore and two counterbore walls per hole (2 + 3n cylinders).
  // If only this test fails while the one above passes, the kernel has split
  // a face. That is harmless, so relax the numbers.
  it.each(cases)("%i holes: expected face counts", async (holes) => {
    const s = analyseStep(await stepOf({ holes, clearance: NO_CLEARANCE }));
    expect(s.faceTypes).toEqual({
      PLANE: 4 + 2 * holes,
      CYLINDRICAL_SURFACE: 2 + 3 * holes,
    });
  });

  it("still only planes and cylinders with clearance applied", async () => {
    const clearance = { ...NO_CLEARANCE, hole: 0.2, width: -0.1, height: 0.1 };
    const s = analyseStep(await stepOf({ holes: 3, clearance }));
    expect(s.faceTypes).toEqual({ PLANE: 10, CYLINDRICAL_SURFACE: 11 });
    expect(Object.keys(s.edgeTypes).sort()).toEqual(["CIRCLE", "LINE"]);
  });

  it("refuses invalid parameters", () => {
    expect(() => build({ holes: 1, clearance: NO_CLEARANCE })).toThrow();
  });
});
