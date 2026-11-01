import { describe, it, expect } from "vitest";
import { requiredDistance, shouldRefit, boundsOf, MARGIN, VIEW_FROM, LIGHT_FROM } from "../src/cameraFit";

describe("requiredDistance", () => {
  it("uses the vertical field of view in a wide viewport", () => {
    const expected = (10 / Math.sin((50 * Math.PI) / 180 / 2)) * MARGIN;
    expect(requiredDistance(50, 10, 2)).toBeCloseTo(expected);
  });

  it("needs more distance in a narrow (portrait) viewport", () => {
    expect(requiredDistance(50, 10, 0.5)).toBeGreaterThan(requiredDistance(50, 10, 2));
  });

  it("scales with the model radius", () => {
    expect(requiredDistance(50, 20, 1.5)).toBeCloseTo(2 * requiredDistance(50, 10, 1.5));
  });
});

describe("shouldRefit", () => {
  const last = { radius: 10, distance: 30 };
  const base = { last, radius: 10, currentDistance: 30, targetOffset: 0 };

  it("always fits the first time", () => {
    expect(shouldRefit({ ...base, last: null })).toBe(true);
  });

  it("refits when the model size changed a lot, even if the user zoomed", () => {
    expect(shouldRefit({ ...base, radius: 20, currentDistance: 12 })).toBe(true);
  });

  it("refits an untouched view when only the viewport changed", () => {
    expect(shouldRefit({ ...base, currentDistance: 30.3 })).toBe(true);
  });

  it("keeps the user's zoom when only the viewport or a small model change happened", () => {
    expect(shouldRefit({ ...base, currentDistance: 15 })).toBe(false);
    expect(shouldRefit({ ...base, radius: 10.5, currentDistance: 15 })).toBe(false);
  });

  it("keeps the user's pan", () => {
    expect(shouldRefit({ ...base, targetOffset: 2 })).toBe(false);
  });
});

describe("boundsOf", () => {
  it("returns the centre, half diagonal and size of the vertices' bounding box", () => {
    // corners of a box from (0, 0, 0) to (2, 4, 4)
    const box = [0, 0, 0, 2, 4, 4, 2, 0, 4, 0, 4, 0];
    expect(boundsOf(box)).toEqual({ center: [1, 2, 2], radius: 3, size: [2, 4, 4] });
    expect(boundsOf(new Float32Array(box))).toEqual({ center: [1, 2, 2], radius: 3, size: [2, 4, 4] });
  });

  it("returns null when there are no vertices", () => {
    expect(boundsOf([])).toBeNull();
    expect(boundsOf(undefined)).toBeNull();
  });
});

// The camera looks at the origin with Z up; its screen-right direction is up × (camera - target).
describe("starting view", () => {
  const [x, y, z] = VIEW_FROM;
  const right = [-y, x, 0] as const; // (0, 0, 1) × (x, y, z)

  it("shows +X on the right, so a part's first end (at -X) is on the left", () => {
    expect(right[0]).toBeGreaterThan(0);
    expect(Math.abs(right[0])).toBeGreaterThan(Math.abs(right[1])); // X runs mostly across the screen
  });

  it("looks from above, with the light on the camera's side", () => {
    expect(z).toBeGreaterThan(0);
    const dot = LIGHT_FROM[0] * x + LIGHT_FROM[1] * y + LIGHT_FROM[2] * z;
    expect(dot).toBeGreaterThan(0);
  });
});
