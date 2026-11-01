import "./openCascade";
import { describe, it, expect } from "vitest";

import { buildPart } from "../src/parts/builders";
import { NO_CLEARANCE, type Clearance } from "../src/spec";
import { stepGeometry, type StepGeometry, type Vec } from "./stepStats";
import { measureBeam, gaps, expectedBeam, NOMINAL, BEAM_HEIGHTS } from "./beamGeometry";

const measure = async (holes: number, clearance: Clearance) =>
  measureBeam(
    stepGeometry(
      await buildPart({ partId: "beam", params: { holes, height: 0 }, clearance })
        .blobSTEP()
        .text(),
    ),
  );

// The measuring code itself, on the faces of a nominal 3-hole beam written out by
// hand (not by the generator), away from the origin: holes at x = 5, 13, 21 on the
// line y = 2, faces at z = 1 and 9. The STEP reader is checked on files in beam.test.ts.
describe("beam measurements on a hand-written beam", () => {
  const Z: Vec = [0, 0, 1];
  const DOWN: Vec = [0, 0, -1];
  const plane = (origin: Vec, normal: Vec) => ({ origin, normal });
  const cylinder = (x: number, radius: number) => ({ origin: [x, 2, 1] as Vec, axis: Z, radius });
  const holes = [5, 13, 21];
  const beam: StepGeometry = {
    millimetres: true,
    planes: [
      plane([0, -1.6, 1], [0, -1, 0]), // the flat sides, 7.2 apart
      plane([0, 5.6, 1], [0, 1, 0]),
      plane([0, 0, 1], DOWN), // bottom and top faces
      plane([0, 0, 9], Z),
      ...holes.flatMap((x) => [plane([x, 2, 1.8], Z), plane([x, 2, 8.2], DOWN)]), // counterbore floors, 0.8 deep
    ],
    cylinders: [
      cylinder(5, 3.6), // the rounded ends
      cylinder(21, 3.6),
      ...holes.flatMap((x) => [cylinder(x, 2.4), cylinder(x, 3.1), cylinder(x, 3.1)]), // bore and two counterbores
    ],
  };

  it("reads the dimensions it was written with", () => {
    const m = measureBeam(beam);
    expect(m).toMatchObject({
      ...expectedBeam(3),
      holeX: holes,
      cboreCount: 6,
      centre: [13, 2, 5],
      holeAxesAlongZ: true,
    });
    expect(gaps(m.holeX)).toEqual([8, 8]);
  });
});

describe("beam dimensions in the exported STEP file", () => {
  const sizes: [number, Clearance][] = [
    [2, NO_CLEARANCE],
    [3, NO_CLEARANCE],
    [32, NO_CLEARANCE],
    [5, { ...NO_CLEARANCE, hole: 0.2, width: -0.1, height: 0.1 }],
  ];
  const cases = Object.keys(BEAM_HEIGHTS).flatMap((name) => sizes.map(([h, c]) => [name, h, c] as const));

  it.each(cases)("%s height, %i holes, clearance %j", async (name, holes, clearance) => {
    const { height, nominal } = BEAM_HEIGHTS[name]!;
    const blob = buildPart({ partId: "beam", params: { holes, height }, clearance }).blobSTEP();
    const g = stepGeometry(await blob.text());
    const m = measureBeam(g);

    expect(g.millimetres).toBe(true);
    expect(m).toMatchObject(expectedBeam(holes, clearance, nominal));
    // Holes: the right number, 8 mm apart (never changed by clearance), counterbores on both faces.
    expect(m.holeX).toHaveLength(holes);
    expect(gaps(m.holeX).every((g) => g === NOMINAL.pitch)).toBe(true);
    expect(m.cboreCount).toBe(2 * holes);
    expect(m.holeAxesAlongZ).toBe(true);
    // Centred on the origin, so the part lands where users expect it in CAD/CAM.
    expect(m.centre).toEqual([0, 0, 0]);
  });

  it("applies clearance by the typed amounts (hand-computed values)", async () => {
    const m = await measure(3, { ...NO_CLEARANCE, hole: -0.1, width: 0.3, height: -0.2 });
    expect(m.width).toBe(7.5);
    expect(m.height).toBe(7.8);
    expect(m.holeD).toBe(4.7);
  });

  it("half-height beam: 4 mm high with the full beam's holes (hand-computed values)", async () => {
    const step = await buildPart({ partId: "beam", params: { holes: 3, height: 1 }, clearance: NO_CLEARANCE })
      .blobSTEP()
      .text();
    const m = measureBeam(stepGeometry(step));
    expect(m).toMatchObject({ width: 7.2, height: 4, holeD: 4.8, cboreD: 6.2, cboreDepths: [0.8], length: 23.2 });
  });
});
