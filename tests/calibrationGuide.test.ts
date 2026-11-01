import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { guideHtml, stepGuideHtml } from "../src/guideHtml";
import { PARTS } from "../src/parts/index";
import { CALIBRATION_STEPS } from "../src/calibrationSteps";
import { MAX_CLEARANCE } from "../src/parts/calibration";
import {
  SPEC,
  AXLE,
  PIN,
  BRICK,
  CLEARANCE_FIELDS,
  AXLE_SIZE_LIMIT,
  PIN_SIZE_LIMIT,
  COLLAR_SIZE_LIMIT,
  STUD_SIZE_LIMIT,
  UNDERSIDE_SIZE_LIMIT,
} from "../src/spec";
import { SOURCE_URL } from "../src/links";

// docs/calibration.md is shown in the app as well. These checks keep it in step
// with the code: every setting and calibration bar, and the numbers it quotes.
const guide = readFileSync(fileURLToPath(new URL("../docs/calibration.md", import.meta.url)), "utf8");

describe("calibration guide", () => {
  it.each(CLEARANCE_FIELDS.map((f) => f.name))("explains the %s setting", (name) => {
    expect(guide).toContain(`**${name}**`);
  });

  it.each(PARTS.filter((p) => p.calibration).map((p) => p.name))("has a section on the %s", (name) => {
    expect(guide).toMatch(new RegExp(`^### \\d\\. ${name}`, "m"));
  });

  it("quotes the current nominal sizes and limits", () => {
    for (const mm of [
      SPEC.holeD,
      SPEC.cboreD,
      SPEC.width,
      AXLE.crossD,
      AXLE.armWidth,
      AXLE.stopInD,
      PIN.shaftD,
      PIN.slotWidth,
    ]) {
      expect(guide).toContain(`${mm} mm`);
    }
    expect(guide).toContain(`${SPEC.collarD.toFixed(1)} mm`);
    expect(guide).toContain(`${BRICK.studD} mm`);
    expect(guide).toContain(`${BRICK.tubeD.toFixed(2)} mm`);
    expect(guide).toContain(`values must stay within ±${MAX_CLEARANCE.toFixed(1)} mm`);
    expect(guide).toContain(
      `calibration axle's and the pin, collar, stud and underside bars' within ±${Math.max(AXLE_SIZE_LIMIT, PIN_SIZE_LIMIT, COLLAR_SIZE_LIMIT, STUD_SIZE_LIMIT, UNDERSIDE_SIZE_LIMIT)} mm`,
    );
    expect(guide).toContain(`${PIN.ribHeight} mm above the shaft`);
  });

  it("links to the project's own issues page", () => {
    expect(guide).toContain(`<${SOURCE_URL}/issues>`);
  });

  it("has no relative links, which would break inside the app", () => {
    expect(guide).not.toMatch(/\]\((?!https?:)/);
  });

  it("renders to HTML for the app", () => {
    expect(guideHtml).toMatch(/^<h1>Calibration guide<\/h1>/);
    expect(guideHtml).toContain("<table>");
  });

  // The Calibrate section shows each step's section under "Test", without its heading.
  it.each(CALIBRATION_STEPS.map((s) => s.id))("renders the %s step's section for the Calibrate section", (id) => {
    expect(stepGuideHtml[id]).toMatch(/^<p>/);
    expect(stepGuideHtml[id]).toContain("<ol>");
    expect(stepGuideHtml[id]).not.toMatch(/<h\d/);
  });

  it("names the app's sections and buttons as the app does", () => {
    for (const label of [
      "Calibrate",
      "Fit settings",
      "Result",
      "Save to file",
      "Load from file",
      "Download all calibration parts",
      "Download the check set",
      "middle value",
      "Your fit settings",
    ]) {
      expect(guide).toContain(`**${label}**`);
    }
  });
});
