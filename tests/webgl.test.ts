import { describe, it, expect } from "vitest";
import { webglAvailable } from "../src/webgl";

// A fake document whose canvas answers getContext with the given function.
const docWith = (getContext: (type: string) => unknown) =>
  ({ createElement: () => ({ getContext }) }) as unknown as Pick<Document, "createElement">;

describe("webglAvailable", () => {
  it("is true when webgl2 is available", () => {
    expect(webglAvailable(docWith((t) => (t === "webgl2" ? {} : null)))).toBe(true);
  });

  it("falls back to webgl", () => {
    expect(webglAvailable(docWith((t) => (t === "webgl" ? {} : null)))).toBe(true);
  });

  it("is false when no context can be created", () => {
    expect(webglAvailable(docWith(() => null))).toBe(false);
  });

  it("is false when creating the canvas or context throws", () => {
    expect(
      webglAvailable(
        docWith(() => {
          throw new Error("blocked");
        }),
      ),
    ).toBe(false);
    const broken = {
      createElement: () => {
        throw new Error("no dom");
      },
    } as unknown as Pick<Document, "createElement">;
    expect(webglAvailable(broken)).toBe(false);
  });
});
