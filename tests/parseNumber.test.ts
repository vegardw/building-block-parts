import { describe, it, expect } from "vitest";
import { parseNumber } from "../src/parseNumber";

describe("parseNumber", () => {
  const accepted: [string, number][] = [
    ["0.2", 0.2],
    ["0,2", 0.2], // decimal comma
    ["-0,1", -0.1],
    ["\u22120.10", -0.1], // the typographic minus the app displays
    ["+0.05", 0.05],
    [".5", 0.5],
    ["5.", 5],
    ["  0.2 ", 0.2],
    ["7", 7],
  ];
  it.each(accepted)("accepts %j", (text, expected) => {
    expect(parseNumber(text)).toBe(expected);
  });

  it.each([
    "",
    " ",
    "-",
    ".",
    ",",
    "abc",
    "0.1abc",
    "1e-1",
    "0x10",
    "1.2.3",
    "1,2,3",
    "1,000.5",
    "--1",
    "Infinity",
    "NaN",
  ])("rejects %j", (text) => {
    expect(parseNumber(text)).toBeNull();
  });

  it("never returns negative zero", () => {
    expect(Object.is(parseNumber("-0"), 0)).toBe(true);
    expect(Object.is(parseNumber("-0,0"), 0)).toBe(true);
  });
});
