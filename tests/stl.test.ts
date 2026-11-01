import "./openCascade";
import { describe, it, expect, vi, afterEach } from "vitest";

import { REGULAR_PARTS, requirePart, defaultText, parseParams } from "../src/parts/index";
import { buildPart, exportSet, exportShape } from "../src/parts/builders";
import { NO_CLEARANCE, type Clearance } from "../src/spec";
import { analyseStl } from "./stlStats";

// STL is a mesh made from the exact solid; STEP stays the exact file. Expected
// sizes written out by hand: a 5-hole beam is 4 × 8 + 7.2 = 39.2 mm long.
const stlOf = async (partId: string, params?: Record<string, number>, clearance: Clearance = NO_CLEARANCE) => {
  const part = requirePart(partId);
  const shape = buildPart({ partId, params: params ?? parseParams(part, defaultText(part)), clearance });
  return analyseStl(await (await exportShape(shape, "stl")).arrayBuffer());
};
// The mesh lies within 0.001 mm of the surfaces, so a size can be that much short at each end.
const expectSize = (size: number[], expected: number[]) =>
  size.forEach((d, k) => expect(Math.abs(d - expected[k]!), `axis ${k}: ${d}`).toBeLessThan(0.003));

describe("STL export", () => {
  it("writes a binary mesh of a beam at its exact size", async () => {
    const s = await stlOf("beam", { holes: 5, height: 0 });
    expect(s.triangles).toBeGreaterThan(100);
    expectSize(s.size, [39.2, 7.2, 8]);
  });

  it("applies the fit settings, as the STEP file does", async () => {
    const s = await stlOf("beam", { holes: 5, height: 1 }, { ...NO_CLEARANCE, width: -0.1, height: 0.2 });
    expectSize(s.size, [39.1, 7.1, 4.2]);
  });

  it.each(REGULAR_PARTS.map((p) => p.id))("%s with default parameters", async (id) => {
    const s = await stlOf(id);
    expect(s.triangles).toBeGreaterThan(50);
  });

  it("puts several parts in one mesh, laid out in a row on z = 0", async () => {
    const request = { partId: "pin", params: { sideA: 0, sideB: 0, ends: 0 }, clearance: NO_CLEARANCE }; // 2L pins
    const s = analyseStl(await exportSet([{ request, count: 3, name: "2L pin" }], "stl").arrayBuffer());
    // Three 16 mm pins with 8 mm between them: 64 mm; collar Ø6.0 across.
    expectSize(s.size, [64, 6, 6]);
    expect(Math.abs(s.min[2])).toBeLessThan(0.003);
  });
});

describe("STL for several parts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The prototype that defines a method, so a spy sees every shape's calls.
  const owner = (shape: object, method: string): Record<string, unknown> => {
    let proto = Object.getPrototypeOf(shape) as object | null;
    while (proto && !Object.prototype.hasOwnProperty.call(proto, method))
      proto = Object.getPrototypeOf(proto) as object | null;
    if (!proto) throw new Error(`no ${method}`);
    return proto as Record<string, unknown>;
  };

  it("meshes each part once, however many copies", () => {
    const beam = { partId: "beam", params: { holes: 15, height: 0 }, clearance: NO_CLEARANCE };
    const probe = buildPart(beam);
    const mesh = vi.spyOn(owner(probe, "mesh") as { mesh: () => unknown }, "mesh");
    const blobSTL = vi.spyOn(owner(probe, "blobSTL") as { blobSTL: () => unknown }, "blobSTL");
    probe.delete();
    exportSet([{ request: beam, count: 30, name: "15-hole beam" }], "stl");
    expect(mesh).toHaveBeenCalledTimes(1);
    expect(blobSTL).not.toHaveBeenCalled();
  });

  it("writes the same triangles OpenCascade writes for each part on its own", async () => {
    const items = [
      { request: { partId: "beam", params: { holes: 5, height: 1 }, clearance: NO_CLEARANCE }, count: 2, name: "beam" },
      {
        request: { partId: "pin", params: { sideA: 2, sideB: 3, ends: 0 }, clearance: NO_CLEARANCE },
        count: 3,
        name: "pin",
      },
      {
        request: { partId: "axle", params: { length: 4, endA: 1, endB: 2 }, clearance: NO_CLEARANCE },
        count: 1,
        name: "axle",
      },
    ];
    const set = analyseStl(await exportSet(items, "stl").arrayBuffer());
    // OpenCascade's own STL of each part, once per copy: area and volume don't depend on where a copy is.
    const expected = { triangles: 0, area: 0, volume: 0 };
    for (const { request, count } of items) {
      const one = analyseStl(await (await exportShape(buildPart(request), "stl")).arrayBuffer());
      expected.triangles += count * one.triangles;
      expected.area += count * one.area;
      expected.volume += count * one.volume;
    }
    expect(set.triangles).toBe(expected.triangles);
    expect(set.area / expected.area - 1).toBeCloseTo(0, 6);
    expect(set.volume / expected.volume - 1).toBeCloseTo(0, 6);
    expect(set.volume).toBeGreaterThan(0); // the triangles face outwards
  });
});
