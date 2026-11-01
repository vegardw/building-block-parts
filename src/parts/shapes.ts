import type { Shape3D } from "replicad";

// replicad types extrude() as returning any kind of shape (edge, face, solid, ...).
// Our builders need a 3D shape: the kinds that can be fused and cut. This narrows
// the type, and fails loudly if something unexpected comes back.
export function as3D(shape: object): Shape3D {
  if (typeof (shape as { fuse?: unknown }).fuse !== "function") {
    throw new Error("Expected a 3D shape");
  }
  return shape as Shape3D;
}
