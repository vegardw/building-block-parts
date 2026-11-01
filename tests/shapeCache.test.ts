import { describe, it, expect, vi } from "vitest";
import { createShapeCache, disposeQuietly } from "../src/shapeCache";

const fakeShape = () => ({ delete: vi.fn() });
const req = (holes: number) => ({ partId: "beam", params: { holes }, clearance: { hole: 0, width: 0, height: 0 } });

describe("shape cache", () => {
  it("builds once per distinct request and reuses the shape", () => {
    const build = vi.fn(fakeShape);
    const cache = createShapeCache(build);
    const a = cache.get(req(3));
    expect(cache.has(req(3))).toBe(true);
    expect(cache.get(req(3))).toBe(a);
    expect(build).toHaveBeenCalledTimes(1);
    expect(cache.has(req(4))).toBe(false);
  });

  it("frees the previous shape only after the new one is built", () => {
    const first = fakeShape();
    const second = fakeShape();
    const shapes = [first, second];
    const cache = createShapeCache(() => {
      if (shapes.length === 1) expect(first.delete).not.toHaveBeenCalled(); // still alive while building
      return shapes.shift()!;
    });
    cache.get(req(3));
    cache.get(req(4));
    expect(first.delete).toHaveBeenCalledTimes(1);
    expect(second.delete).not.toHaveBeenCalled();
  });

  it("keeps the old shape when a build fails", () => {
    const first = fakeShape();
    let fail = false;
    const cache = createShapeCache(() => {
      if (fail) throw new Error("boom");
      return first;
    });
    cache.get(req(3));
    fail = true;
    expect(() => cache.get(req(4))).toThrow("boom");
    expect(first.delete).not.toHaveBeenCalled();
    expect(cache.has(req(3))).toBe(true);
  });

  it("clear() frees the shape and empties the cache", () => {
    const shape = fakeShape();
    const cache = createShapeCache(() => shape);
    cache.get(req(3));
    cache.clear();
    expect(shape.delete).toHaveBeenCalledTimes(1);
    expect(cache.has(req(3))).toBe(false);
  });

  it("ignores errors from delete()", () => {
    expect(() =>
      disposeQuietly({
        delete: () => {
          throw new Error("already deleted");
        },
      }),
    ).not.toThrow();
    expect(() => disposeQuietly(null)).not.toThrow();
  });
});
