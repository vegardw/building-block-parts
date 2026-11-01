import "./openCascade";
import { describe, it, expect } from "vitest";
import { PARTS, requirePart, defaultText, parseParams } from "../src/parts/index";
import { buildPart, exportSet } from "../src/parts/builders";
import { NO_CLEARANCE } from "../src/spec";
import { analyseStep, stepGeometry } from "./stepStats";

// Safety net for every part, including future ones: analytic geometry only.
const FACES = ["PLANE", "CYLINDRICAL_SURFACE", "CONICAL_SURFACE", "SPHERICAL_SURFACE", "TOROIDAL_SURFACE"];
const EDGES = ["LINE", "CIRCLE", "ELLIPSE"];

describe("every registered part exports only analytic geometry", () => {
  it.each(PARTS.map((p) => p.id))("%s with default parameters", async (id) => {
    const part = requirePart(id);
    const params = parseParams(part, defaultText(part));
    const blob = buildPart({ partId: id, params, clearance: NO_CLEARANCE }).blobSTEP();
    const s = analyseStep(await blob.text());
    expect(Object.keys(s.faceTypes).filter((t) => !FACES.includes(t))).toEqual([]);
    expect(Object.keys(s.edgeTypes).filter((t) => !EDGES.includes(t))).toEqual([]);
  });
});

// The worker caches a built shape and meshes/exports it repeatedly, so neither
// call may consume the shape.
describe("a built shape can be meshed and exported repeatedly", () => {
  it.each(PARTS.map((p) => p.id))("%s", async (id) => {
    const part = requirePart(id);
    const params = parseParams(part, defaultText(part));
    const shape = buildPart({ partId: id, params, clearance: NO_CLEARANCE });

    const mesh1 = shape.mesh();
    const step1 = analyseStep(await shape.blobSTEP().text());
    const mesh2 = shape.mesh();
    const step2 = analyseStep(await shape.blobSTEP().text());

    expect(mesh2.vertices.length).toBe(mesh1.vertices.length);
    expect(step2).toEqual(step1);
  });
});

const defaultRequest = (partId: string) => {
  const part = requirePart(partId);
  return { partId, params: parseParams(part, defaultText(part)), clearance: NO_CLEARANCE };
};

// "Download all" on the Calibrate section and the parts list: several parts in one file.
describe("several parts in one STEP file", () => {
  it("has each part as a named solid, laid out on z = 0, with only analytic geometry", async () => {
    const ids = ["calibration", "axle-calibration", "pin-calibration", "collar-calibration"];
    const items = ids.map((partId) => ({ request: defaultRequest(partId), count: 1, name: requirePart(partId).name }));
    const step = await exportSet(items, "step").text();
    const s = analyseStep(step);
    expect(Object.keys(s.faceTypes).filter((t) => !FACES.includes(t))).toEqual([]);
    expect(Object.keys(s.edgeTypes).filter((t) => !EDGES.includes(t))).toEqual([]);
    expect((step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length).toBe(4);
    for (const id of ids) expect(step).toContain(`'${requirePart(id).name}'`);

    const g = stepGeometry(step);
    expect(g.millimetres).toBe(true);
    const zs = g.planes.filter((p) => Math.abs(p.normal[2]) === 1).map((p) => p.origin[2]);
    expect(Math.min(...zs)).toBeCloseTo(0, 6);
  });

  it("copies a part as often as asked, numbering the copies' names", async () => {
    const step = await exportSet([{ request: defaultRequest("pin"), count: 3, name: "3L pin" }], "step").text();
    expect((step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length).toBe(3);
    for (const n of [1, 2, 3]) expect(step).toContain(`'3L pin (${n})'`);
  });

  it("refuses a part with invalid parameters, with its validation message", () => {
    const request = { partId: "calibration", params: { perSide: 7, step: 0.1, centre: 0 }, clearance: NO_CLEARANCE };
    expect(() => exportSet([{ request, count: 1, name: "bar" }], "step")).toThrow(/beyond the limit/);
  });
});
