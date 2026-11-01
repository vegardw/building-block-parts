import "./openCascade";
import { describe, it, expect } from "vitest";

import { PARTS, defaultText, parseParams } from "../src/parts/index";
import { buildPart, exportShape, meshBuffers, previewMesh } from "../src/parts/builders";
import { boundsOf } from "../src/cameraFit";
import { NO_CLEARANCE } from "../src/spec";
import { analyseStl } from "./stlStats";

const beam = { partId: "beam", params: { holes: 5, height: 0 }, clearance: NO_CLEARANCE };
const stlOf = async (shape: ReturnType<typeof buildPart>) =>
  analyseStl(await (await exportShape(shape, "stl")).arrayBuffer());

describe("previewMesh", () => {
  it("is handed to the page, not copied", () => {
    const mesh = previewMesh(buildPart(beam));
    const buffers = meshBuffers(mesh);
    expect(new Set(buffers).size).toBe(4);
    const received = structuredClone(mesh, { transfer: buffers }); // what postMessage does with a transfer list
    expect(mesh.faces.vertices.byteLength).toBe(0); // the worker's copy is gone
    expect(received.faces.vertices).toBeInstanceOf(Float32Array);
    expect(received.faces.triangles).toBeInstanceOf(Uint32Array);
    expect(received.faces.vertices.length).toBeGreaterThan(0);
  });

  it("is coarser than the STL mesh, but within 0.01 mm of the part", async () => {
    const shape = buildPart(beam);
    const preview = previewMesh(shape);
    const stl = await stlOf(shape);
    expect(preview.faces.triangles.length / 3).toBeLessThan(stl.triangles / 2);
    const size = boundsOf(preview.faces.vertices)?.size ?? [];
    [39.2, 7.2, 8].forEach((d, k) => expect(Math.abs((size[k] ?? 0) - d), `axis ${k}`).toBeLessThan(0.011));
  });

  it("is about 1 MB for the longest beam, so keeping a few on the page is cheap (previews.ts)", () => {
    const { faces, edges } = previewMesh(buildPart({ ...beam, params: { holes: 32, height: 0 } }));
    const bytes = [faces.vertices, faces.normals, faces.triangles, edges.lines].reduce((n, a) => n + a.byteLength, 0);
    expect(bytes).toBeLessThan(1.5 * 1048576);
  });

  it("leaves a later STL export as fine as without a preview", async () => {
    const fresh = await stlOf(buildPart(beam));
    const shape = buildPart(beam);
    previewMesh(shape);
    const after = await stlOf(shape);
    expect(after.triangles).toBe(fresh.triangles);
    expect(after.area).toBeCloseTo(fresh.area, 6);
  });

  it.each(PARTS.map((p) => p.id))("%s: a well-formed mesh with edges", (id) => {
    const part = PARTS.find((p) => p.id === id)!;
    const { faces, edges } = previewMesh(
      buildPart({ partId: id, params: parseParams(part, defaultText(part)), clearance: NO_CLEARANCE }),
    );
    const vertexCount = faces.vertices.length / 3;
    expect(faces.normals.length).toBe(faces.vertices.length);
    expect(faces.triangles.length % 3).toBe(0);
    expect(Math.max(...faces.triangles)).toBeLessThan(vertexCount);
    expect(edges.lines.length % 6).toBe(0); // whole segments, two points each
    expect(edges.lines.length).toBeGreaterThan(0);
  });
});
