// Reads a binary STL file (no CAD dependency): the triangle count, the bounding
// box of all vertices, the surface area and the enclosed volume. The volume is
// signed (divergence theorem): positive only if the triangles face outwards.
export interface StlStats {
  triangles: number;
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
  area: number;
  volume: number;
}

export function analyseStl(buffer: ArrayBuffer): StlStats {
  const view = new DataView(buffer);
  const triangles = view.getUint32(80, true);
  if (buffer.byteLength !== 84 + 50 * triangles) throw new Error("Not a binary STL file: the length doesn't match");
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let [area, volume] = [0, 0];
  for (let t = 0; t < triangles; t++) {
    const corner = (v: number) =>
      [0, 1, 2].map((k) => view.getFloat32(84 + 50 * t + 12 + 12 * v + 4 * k, true)) as [number, number, number]; // after the normal
    const [a, b, c] = [corner(0), corner(1), corner(2)];
    for (const p of [a, b, c]) {
      for (const k of [0, 1, 2] as const) {
        min[k] = Math.min(min[k], p[k]);
        max[k] = Math.max(max[k], p[k]);
      }
    }
    // (b - a) × (c - a) for the area; a · (b × c) / 6 for the signed volume
    const [u, w] = [b.map((x, k) => x - a[k]!), c.map((x, k) => x - a[k]!)] as [number[], number[]];
    area += Math.hypot(u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!) / 2;
    volume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
  }
  return { triangles, min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]], area, volume };
}
