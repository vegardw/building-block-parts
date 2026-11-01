import { describe, it, expect } from "vitest";
import { shelf, shelfLayout } from "../src/layout";

describe("shelfLayout", () => {
  it("places parts left to right with a gap", () => {
    expect(
      shelfLayout(
        [
          [10, 5],
          [20, 8],
        ],
        100,
        2,
      ),
    ).toEqual([
      [0, 0],
      [12, 0],
    ]);
  });

  it("starts a new row behind the deepest part of the last one", () => {
    expect(
      shelfLayout(
        [
          [50, 5],
          [40, 9],
          [30, 4],
        ],
        100,
        2,
      ),
    ).toEqual([
      [0, 0],
      [52, 0],
      [0, 11],
    ]);
  });

  it("gives a part wider than a row a row of its own", () => {
    expect(
      shelfLayout(
        [
          [135, 7],
          [70, 7],
        ],
        120,
        8,
      ),
    ).toEqual([
      [0, 0],
      [0, 15],
    ]);
    expect(
      shelfLayout(
        [
          [70, 7],
          [135, 7],
        ],
        120,
        8,
      ),
    ).toEqual([
      [0, 0],
      [0, 15],
    ]);
  });

  it("returns nothing for nothing", () => {
    expect(shelfLayout([], 100, 2)).toEqual([]);
  });
});

describe("shelf", () => {
  it("places parts one at a time, as shelfLayout does", () => {
    const sizes: [number, number][] = [
      [50, 10],
      [40, 30],
      [30, 5],
      [120, 8],
      [10, 10],
    ];
    const place = shelf(100, 8);
    expect(sizes.map((size) => place(size))).toEqual(shelfLayout(sizes, 100, 8));
  });

  it("starts each shelf empty", () => {
    shelf(100, 8)([60, 20]);
    expect(shelf(100, 8)([60, 20])).toEqual([0, 0]);
  });
});
