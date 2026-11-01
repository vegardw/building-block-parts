// CAD side of the registry (imports replicad, so it is only used by the worker and tests).
import { exportSTEP } from "replicad";
import type { Shape3D } from "replicad";
import { SPEC, type Clearance } from "../spec";
import { runKernel } from "../kernelError";
import { disposeQuietly } from "../shapeCache";
import { getPart, validatePart } from "./index";
import type { BuildRequest, FileFormat, MeshData, ParamValues, SetItem } from "./types";
import { shelf } from "../layout";
import { binaryStl, type Offset } from "../stl";
import { buildBeam } from "./beam.build";
import { buildCalibration } from "./calibration.build";
import { buildAxle } from "./axle.build";
import { buildAxleCalibration } from "./axleCalibration.build";
import { buildCollarCalibration } from "./collarCalibration.build";
import { buildPin } from "./pin.build";
import { buildPinCalibration } from "./pinCalibration.build";

// Method syntax makes the parameter types bivariant, so builders that take
// specific parameter types (e.g. { holes: number }) fit in the shared record.
type Builder = { build(params: ParamValues, clearance: Clearance): Shape3D }["build"];

export const BUILDERS: Record<string, Builder> = {
  beam: buildBeam,
  calibration: buildCalibration,
  axle: buildAxle,
  "axle-calibration": buildAxleCalibration,
  "collar-calibration": buildCollarCalibration,
  pin: buildPin,
  "pin-calibration": buildPinCalibration,
};

export function buildPart({ partId, params, clearance }: BuildRequest): Shape3D {
  const part = getPart(partId);
  const builder = BUILDERS[partId];
  if (!part || !builder) throw new Error(`Unknown part: ${partId}`);
  // Validation keeps degenerate input away from the kernel: there it can fail
  // cryptically or never return (a zero-height beam hangs it).
  const problem = validatePart(part, params, clearance);
  if (problem) throw new Error(problem);
  return runKernel("build this part", () => builder(params, clearance));
}

// Room between parts laid out together, so the slicer or CAM can tell them
// apart, and the width of a row: a typical resin printer's plate.
const SET_GAP = SPEC.pitch;
const ROW_WIDTH = 120;

// STL: a triangle mesh within 0.001 mm of the exact surfaces, at most 0.1 rad
// between neighbouring facets, binary to keep the file small. A looser angle would
// leave holes up to about 0.015 mm undersize (docs/architecture.md, "STL").
const STL_MESH = { tolerance: 0.001, angularTolerance: 0.1 };

// The preview's mesh is coarser: within 0.01 mm of the surfaces, which is far
// below a pixel, with a third of the triangles. The mesher always
// meshes to the tolerance it is asked for, so an STL export of the same shape
// afterwards still gets the fine mesh.
const PREVIEW_MESH = { tolerance: 0.01, angularTolerance: 0.3 };

export function previewMesh(shape: Shape3D): MeshData {
  return runKernel("prepare the 3D preview", () => {
    const faces = shape.mesh(PREVIEW_MESH);
    const edges = shape.meshEdges(PREVIEW_MESH);
    return {
      faces: {
        vertices: new Float32Array(faces.vertices),
        normals: new Float32Array(faces.normals),
        triangles: new Uint32Array(faces.triangles),
      },
      edges: { lines: new Float32Array(edges.lines) },
    };
  });
}

// The buffers behind a mesh, to transfer it to the page instead of copying it.
export const meshBuffers = ({ faces, edges }: MeshData): ArrayBuffer[] => [
  faces.vertices.buffer,
  faces.normals.buffer,
  faces.triangles.buffer,
  edges.lines.buffer,
];

export function exportShape(shape: Shape3D, format: FileFormat): Blob | Promise<Blob> {
  return format === "stl"
    ? runKernel("export the STL file", () => shape.blobSTL({ binary: true, ...STL_MESH }))
    : runKernel("export the STEP file", () => shape.blobSTEP());
}

// Several parts in one file, for one print job, laid out in rows on z = 0 (shelf).
// Each part is built once. In a STEP file every copy is a named solid, so CAD and
// slicers list them by name. An STL file has one mesh with all the parts: each part
// is meshed once and its triangles written once per copy, shifted into place (the
// same triangles OpenCascade would write for each copy, without meshing every copy).
// The shapes are freed afterwards; none is cached.
export function exportSet(items: SetItem[], format: FileFormat): Blob {
  const parts: { shape: Shape3D; name: string; offsets: Offset[] }[] = [];
  try {
    const place = shelf(ROW_WIDTH, SET_GAP);
    for (const { request, count, name } of items) {
      const shape = buildPart(request);
      const [min, max] = shape.boundingBox.bounds;
      const size: [number, number] = [max[0] - min[0], max[1] - min[1]];
      // Where each copy goes: the shift that puts its corner at its place in the layout.
      const offsets = Array.from({ length: count }, (): Offset => {
        const [x, y] = place(size);
        return [x - min[0], y - min[1], -min[2]];
      });
      parts.push({ shape, name, offsets });
    }

    if (format === "stl") {
      const meshes = parts.map(({ shape, offsets }) => {
        const { vertices, triangles } = runKernel("export the STL file", () => shape.mesh(STL_MESH));
        return { vertices, triangles, offsets };
      });
      return new Blob([binaryStl(meshes)], { type: "application/sla" });
    }

    const placed: { shape: Shape3D; name: string; color: string }[] = [];
    try {
      for (const { shape, name, offsets } of parts) {
        offsets.forEach((offset, k) => {
          placed.push({
            shape: shape.clone().translate(...offset), // translate consumes the clone
            name: offsets.length > 1 ? `${name} (${k + 1})` : name,
            color: "#5a8296",
          });
        });
      }
      return runKernel("export the STEP file", () => exportSTEP(placed));
    } finally {
      for (const { shape } of placed) disposeQuietly(shape);
    }
  } finally {
    for (const { shape } of parts) disposeQuietly(shape);
  }
}
