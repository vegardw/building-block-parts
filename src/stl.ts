// Writes a binary STL file from triangle meshes (pure, no CAD import). Each mesh
// is written once per offset: a file with copies of the same parts meshes each
// part once and shifts its triangles, instead of meshing every copy (exportSet).

export type Offset = readonly [number, number, number];

export interface MeshCopies {
  vertices: ArrayLike<number>; // x, y, z of each vertex
  triangles: ArrayLike<number>; // three vertex indices per triangle, counter-clockwise seen from outside
  offsets: readonly Offset[]; // where each copy goes
}

// The 80-byte header; it must not start with "solid", which marks a text STL.
const HEADER = "Binary STL from the Building Block Parts Generator, in millimetres";

// Unit normal of each triangle, the same for every copy (copies are only shifted).
function facetNormals({ vertices: v, triangles: t }: MeshCopies): Float32Array {
  const normals = new Float32Array(t.length);
  const at = (i: number) => v[i] ?? 0;
  for (let i = 0; i + 2 < t.length; i += 3) {
    const [a, b, c] = [(t[i] ?? 0) * 3, (t[i + 1] ?? 0) * 3, (t[i + 2] ?? 0) * 3];
    const [ux, uy, uz] = [at(b) - at(a), at(b + 1) - at(a + 1), at(b + 2) - at(a + 2)];
    const [wx, wy, wz] = [at(c) - at(a), at(c + 1) - at(a + 1), at(c + 2) - at(a + 2)];
    const [nx, ny, nz] = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
    const length = Math.hypot(nx, ny, nz) || 1; // a degenerate triangle gets (0, 0, 0)
    normals.set([nx / length, ny / length, nz / length], i);
  }
  return normals;
}

export function binaryStl(meshes: readonly MeshCopies[]): ArrayBuffer {
  const count = meshes.reduce((n, m) => n + Math.floor(m.triangles.length / 3) * m.offsets.length, 0);
  const buffer = new ArrayBuffer(84 + 50 * count);
  new Uint8Array(buffer, 0, 80).set(new TextEncoder().encode(HEADER).subarray(0, 80));
  const view = new DataView(buffer);
  view.setUint32(80, count, true);
  let p = 84;
  const put = (value: number) => {
    view.setFloat32(p, value, true);
    p += 4;
  };
  for (const mesh of meshes) {
    const { vertices: v, triangles: t } = mesh;
    const normals = facetNormals(mesh);
    for (const [dx, dy, dz] of mesh.offsets) {
      for (let i = 0; i + 2 < t.length; i += 3) {
        put(normals[i] ?? 0);
        put(normals[i + 1] ?? 0);
        put(normals[i + 2] ?? 0);
        for (let k = 0; k < 3; k++) {
          const j = (t[i + k] ?? 0) * 3;
          put((v[j] ?? 0) + dx);
          put((v[j + 1] ?? 0) + dy);
          put((v[j + 2] ?? 0) + dz);
        }
        p += 2; // attribute byte count, 0
      }
    }
  }
  return buffer;
}
