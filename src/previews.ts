// The page's preview meshes (pure): the last few, by request, so going back to a
// part (the other section, Back, "Show" in the parts list, a quick pick) shows it
// at once instead of building it again; and which one was on screen last, which
// stays there, dimmed, while the next part builds.
import type { BuildRequest } from "./parts/types";

export interface Previews<M> {
  meshes: ReadonlyMap<string, M>; // by previewKey, least recently used first
  latest: string | null; // the key of the mesh on screen last
}

export const NO_PREVIEWS: Previews<never> = { meshes: new Map<string, never>(), latest: null };

// How many meshes to keep: a mesh is up to about 1 MB (a 32-hole beam's preview).
export const KEEP = 6;

// Requests are compared by value. Key order matters for that, so the app creates
// a BuildRequest in one place, with its keys always in the same order.
export const previewKey = (request: BuildRequest): string => JSON.stringify(request);

// Keeps a mesh as the most recently used; `shown`: it is the one on screen now.
// The least recently used beyond `keep` are dropped, but never the latest. The
// same object comes back when nothing changes, so React skips the update.
export function remember<M>(previews: Previews<M>, key: string, mesh: M, shown: boolean, keep = KEEP): Previews<M> {
  const latest = shown ? key : previews.latest;
  const keys = [...previews.meshes.keys()];
  if (previews.meshes.get(key) === mesh && keys[keys.length - 1] === key && latest === previews.latest) return previews;
  const meshes = new Map(previews.meshes);
  meshes.delete(key);
  meshes.set(key, mesh);
  for (const old of meshes.keys()) {
    if (meshes.size <= keep) break;
    if (old !== latest) meshes.delete(old);
  }
  return { meshes, latest };
}

// The mesh to show for a request: its own if kept, otherwise the latest one.
export function shownMesh<M>(previews: Previews<M>, key: string | null): M | undefined {
  const own = key === null ? undefined : previews.meshes.get(key);
  return own ?? (previews.latest === null ? undefined : previews.meshes.get(previews.latest));
}
