import { describe, it, expect } from "vitest";
import { stepText } from "../src/stepper";

const holes = { step: 1, min: 2, max: 29, fallback: 3 };
const axleLength = { step: 0.5, min: 1, max: 32, fallback: 4 };

describe("stepText (the −/+ buttons and arrow keys)", () => {
  it("steps by one step", () => {
    expect(stepText("3", 1, holes)).toBe("4");
    expect(stepText("3", -1, holes)).toBe("2");
    expect(stepText("4.5", 1, axleLength)).toBe("5");
    expect(stepText("4,5", -1, axleLength)).toBe("4"); // a decimal comma, as typed
  });

  it("goes to the neighbouring step from a value between steps", () => {
    expect(stepText("4.3", 1, axleLength)).toBe("4.5");
    expect(stepText("4.3", -1, axleLength)).toBe("4");
  });

  it("stays within the range", () => {
    expect(stepText("29", 1, holes)).toBe("29");
    expect(stepText("2", -1, holes)).toBe("2");
    expect(stepText("40", -1, holes)).toBe("29"); // out of range: back to the nearest end
    expect(stepText("0", 1, holes)).toBe("2");
  });

  it("starts from the default when the text isn't a number", () => {
    expect(stepText("", 1, holes)).toBe("3");
    expect(stepText("abc", -1, axleLength)).toBe("4");
  });

  it("keeps float noise out of the text", () => {
    const fine = { step: 0.1, min: 0.1, max: 2, fallback: 0.5 };
    expect(stepText("0.2", 1, fine)).toBe("0.3"); // not 0.30000000000000004
  });
});
