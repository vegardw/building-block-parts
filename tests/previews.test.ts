import { describe, it, expect } from "vitest";
import { NO_PREVIEWS, previewKey, remember, shownMesh, type Previews } from "../src/previews";
import { NO_CLEARANCE } from "../src/spec";

// Meshes are just strings here: the cache doesn't look inside them.
const keys = (p: Previews<string>) => [...p.meshes.keys()];
const fill = (...names: string[]) =>
  names.reduce<Previews<string>>((p, name) => remember(p, name, `mesh ${name}`, true), NO_PREVIEWS);

describe("previews", () => {
  it("keeps meshes by request, the one shown as the latest", () => {
    const p = remember(NO_PREVIEWS, "a", "mesh a", true);
    expect(p.meshes.get("a")).toBe("mesh a");
    expect(p.latest).toBe("a");
    const q = remember(p, "b", "mesh b", false); // arrived after the part changed: kept, not shown
    expect(q.latest).toBe("a");
    expect(keys(q)).toEqual(["a", "b"]);
  });

  it("moves a mesh used again to the end, and drops the least recently used beyond the limit", () => {
    const p = remember(fill("a", "b", "c"), "a", "mesh a", true);
    expect(keys(p)).toEqual(["b", "c", "a"]);
    expect(keys(remember(p, "d", "mesh d", true, 3))).toEqual(["c", "a", "d"]);
  });

  it("never drops the mesh shown last", () => {
    // "a" is on screen; later meshes arrived after the part changed, so weren't shown.
    let p: Previews<string> = remember(NO_PREVIEWS, "a", "mesh a", true);
    for (const k of ["b", "c", "d"]) p = remember(p, k, `mesh ${k}`, false, 2);
    expect(p.latest).toBe("a");
    expect(keys(p)).toEqual(["a", "d"]);
  });

  it("returns the same object when nothing changes, so React skips the update", () => {
    const p = fill("a", "b");
    expect(remember(p, "b", "mesh b", true)).toBe(p);
    expect(remember(p, "a", "mesh a", true)).not.toBe(p); // moves "a" to the end
  });

  it("shows a request's own mesh, else the latest", () => {
    const p = fill("a", "b");
    expect(shownMesh(p, "a")).toBe("mesh a");
    expect(shownMesh(p, "c")).toBe("mesh b");
    expect(shownMesh(p, null)).toBe("mesh b");
    expect(shownMesh<string>(NO_PREVIEWS, "a")).toBeUndefined();
  });

  it("compares requests by value", () => {
    const request = () => ({ partId: "beam", params: { holes: 5, height: 0 }, clearance: { ...NO_CLEARANCE } });
    expect(previewKey(request())).toBe(previewKey(request()));
    expect(previewKey({ ...request(), params: { holes: 6, height: 0 } })).not.toBe(previewKey(request()));
  });
});
