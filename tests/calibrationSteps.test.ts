import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  CALIBRATION_STEPS,
  getStep,
  requireStep,
  stepFor,
  stepState,
  atEnd,
  fromMeasured,
  guideSection,
  type StepId,
} from "../src/calibrationSteps";
import { PARTS, requirePart, validatePart } from "../src/parts/index";
import { calibratedFitValue, typeFitValue, NOMINAL_FIT } from "../src/fit";
import { CLEARANCE_FIELDS, NO_CLEARANCE } from "../src/spec";

describe("calibration steps", () => {
  it("has a step for every calibration part, which finds that part's setting", () => {
    const calibrationParts = PARTS.filter((p) => p.calibration);
    for (const part of calibrationParts) {
      const step = CALIBRATION_STEPS.find((s) => s.partId === part.id);
      expect(step, part.id).toBeDefined();
      expect(step!.settings).toEqual([part.calibration!.setting]);
      expect(step!.guide).toBe(part.name);
    }
  });

  it("finds every fit setting in some step", () => {
    for (const f of CLEARANCE_FIELDS) expect(stepFor(f.key), f.key).toBeDefined();
    expect(stepFor("width")!.id).toBe("size");
    expect(stepFor("height")!.id).toBe("size");
  });

  it("finds every step by its id, and names an unknown one", () => {
    for (const step of CALIBRATION_STEPS) expect(requireStep(step.id)).toBe(step);
    expect(() => requireStep("colour" as StepId)).toThrow("Unknown step: colour");
  });

  it("measures a valid 5-hole beam", () => {
    const step = getStep("size")!;
    expect(step.params).toEqual({ holes: 5, height: 0 }); // a full beam
    expect(validatePart(requirePart(step.partId), step.params!, NO_CLEARANCE)).toBeNull();
  });
});

describe("stepState", () => {
  const size = getStep("size")!;
  const hole = getStep("hole")!;

  it("is none until something is set", () => {
    expect(stepState(NOMINAL_FIT, hole)).toBe("none");
    expect(stepState(NOMINAL_FIT, size)).toBe("none");
  });

  it("is calibrated only when every setting of the step is", () => {
    const width = calibratedFitValue(NOMINAL_FIT, "width", -0.1, "2026-10-31");
    expect(stepState(width, size)).toBe("partly");
    expect(stepState(calibratedFitValue(width, "height", 0, "2026-10-31"), size)).toBe("calibrated");
  });

  it("is hand when a value was typed in", () => {
    expect(stepState(typeFitValue(NOMINAL_FIT, "hole", "0.1", "2026-10-31"), hole)).toBe("hand");
  });
});

describe("atEnd", () => {
  it("is true for the first and last feature only", () => {
    expect([0, 1, 4, 7, 8].map((i) => atEnd(i, 9))).toEqual([true, false, false, false, true]);
  });
});

describe("fromMeasured", () => {
  it("gives the error with the opposite sign, to 0.01 mm", () => {
    expect(fromMeasured("width", 7.3)).toEqual({ value: -0.1 });
    expect(fromMeasured("width", 7.16)).toEqual({ value: 0.04 });
    expect(fromMeasured("height", 7.95)).toEqual({ value: 0.05 });
  });

  it("gives 0, not -0, for a nominal measurement", () => {
    const result = fromMeasured("width", 7.2);
    expect(Object.is("value" in result && result.value, 0)).toBe(true);
  });

  it("rejects a measurement beyond the setting's limit", () => {
    expect(fromMeasured("height", 4)).toEqual({
      error: "4 mm is 4.00 mm from the nominal 8 mm; the beam height setting allows ±1 mm. Check the measurement.",
    });
  });
});

describe("guideSection", () => {
  const markdown = [
    "# Guide",
    "### 1. First part: what it finds",
    "",
    "Text of one.",
    "",
    "1. A step.",
    "### 2. Second part (if needed)",
    "Text of two.",
    "## Next chapter",
    "Not in a section.",
  ].join("\n");

  it("returns the text under a numbered heading, up to the next heading", () => {
    expect(guideSection(markdown, "First part")).toBe("Text of one.\n\n1. A step.");
    expect(guideSection(markdown, "Second part")).toBe("Text of two.");
    expect(guideSection(markdown, "Third part")).toBeNull();
  });

  it("finds a section for every step in the real guide", () => {
    const guide = readFileSync(fileURLToPath(new URL("../docs/calibration.md", import.meta.url)), "utf8");
    for (const step of CALIBRATION_STEPS) {
      expect(guideSection(guide, step.guide)?.length ?? 0, step.id).toBeGreaterThan(100);
    }
  });
});
