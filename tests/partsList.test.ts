import { describe, it, expect } from "vitest";
import { addToList, setCount, removeFromList, totalCount, describeItem, listFrom, MAX_COUNT } from "../src/partsList";
import { requirePart } from "../src/parts/index";

const beam7 = { holes: 7, height: 0 };
const pin3L = { sideA: 0, sideB: 1, ends: 0 };

describe("parts list", () => {
  it("adds parts, and more of a part already in it instead of a second line", () => {
    let list = addToList([], "beam", beam7);
    list = addToList(list, "pin", pin3L, 4);
    list = addToList(list, "beam", { height: 0, holes: 7 }); // the same beam, keys in another order
    expect(list).toEqual([
      { partId: "beam", params: beam7, count: 2 },
      { partId: "pin", params: pin3L, count: 4 },
    ]);
    expect(totalCount(list)).toBe(6);
  });

  it("keeps only the part's own parameters", () => {
    expect(addToList([], "beam", { ...beam7, extra: 1 })[0]!.params).toEqual(beam7);
  });

  it("keeps quantities from 1 to the maximum", () => {
    const list = addToList([], "beam", beam7);
    expect(setCount(list, 0, 0)[0]!.count).toBe(1);
    expect(setCount(list, 0, 500)[0]!.count).toBe(MAX_COUNT);
    expect(addToList(setCount(list, 0, MAX_COUNT), "beam", beam7)[0]!.count).toBe(MAX_COUNT);
  });

  it("removes a line", () => {
    const list = addToList(addToList([], "beam", beam7), "pin", pin3L);
    expect(removeFromList(list, 0).map((i) => i.partId)).toEqual(["pin"]);
  });

  it("describes each line by its part and parameters", () => {
    expect(describeItem({ partId: "beam", params: beam7, count: 1 })).toEqual({
      name: "Beam (liftarm)",
      detail: "7 holes, full height",
    });
    expect(describeItem({ partId: "pin", params: pin3L, count: 1 })).toEqual({ name: "Pin", detail: "3L pin" });
  });
});

describe("part descriptions", () => {
  it.each([
    ["beam", { holes: 5, height: 1 }, "5 holes, half height"],
    ["axle", { length: 4.5, endA: 0, endB: 2 }, "4.5 studs, plain (bevelled) / stop"],
    ["axle", { length: 1, endA: 0, endB: 0 }, "1 stud, plain (bevelled) / plain (bevelled)"],
    ["pin", { sideA: 0, sideB: 4, ends: 1 }, "Axle pin, plain ends"],
    ["pin", { sideA: 7, sideB: 5, ends: 0 }, "Pin, 1.5 studs + axle, 2 studs"],
  ])("%s %j: %s", (id, params, expected) => {
    expect(requirePart(id).describe!(params)).toBe(expected);
  });
});

describe("listFrom (saved list)", () => {
  it("keeps valid lines", () => {
    const saved = [{ partId: "beam", params: beam7, count: 3 }];
    expect(listFrom(saved)).toEqual(saved);
  });

  it("drops unknown parts, calibration parts, invalid parameters and broken lines", () => {
    expect(
      listFrom([
        { partId: "spaceship", params: {}, count: 1 },
        { partId: "calibration", params: { perSide: 4, step: 0.05, centre: 0 }, count: 1 },
        { partId: "beam", params: { holes: 300, height: 0 }, count: 1 },
        { partId: "beam", params: { holes: 7 }, count: 1 }, // saved before the height existed: invalid now
        { partId: "beam", params: beam7, count: "two" },
        null,
        "junk",
      ]),
    ).toEqual([]);
    expect(listFrom("junk")).toEqual([]);
    expect(listFrom(null)).toEqual([]);
  });

  it("brings quantities back into range", () => {
    expect(listFrom([{ partId: "beam", params: beam7, count: 1000 }])[0]!.count).toBe(MAX_COUNT);
  });
});
