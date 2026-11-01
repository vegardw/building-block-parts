import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

import {
  DIMENSION_SECTIONS,
  DIMENSIONS_DOC_URL,
  dimensionSectionFor,
  githubAnchor,
  sourcesUrl,
} from "../src/dimensionTables";
import { REGULAR_PARTS, requirePart } from "../src/parts/index";
import { SPEC, AXLE, BRICK } from "../src/spec";
import { SOURCE_URL } from "../src/links";

// The Dimensions dialog's tables are a short version of docs/dimensions.md and link
// to its sections; these checks keep the two, and the parts, in step.
const doc = readFileSync(new URL("../docs/dimensions.md", import.meta.url), "utf8");
const headings = [...doc.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
const sections = DIMENSION_SECTIONS.map((s) => [s.title, s] as const);
const rowOf = (section: string, feature: string) =>
  DIMENSION_SECTIONS.find((s) => s.id === section)?.rows.find((r) => r.feature === feature);

describe("dimension tables", () => {
  it.each(REGULAR_PARTS.map((p) => p.id))("have a section for %s", (id) => {
    expect(dimensionSectionFor(id)).toBeDefined();
  });

  it("cover each part once, with ids of their own", () => {
    const parts = DIMENSION_SECTIONS.flatMap((s) => s.parts);
    expect(new Set(parts).size).toBe(parts.length);
    for (const id of parts) expect(requirePart(id).calibration).toBeUndefined();
    const ids = DIMENSION_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(sections)("%s links to its section of docs/dimensions.md on GitHub", (_, s) => {
    expect(headings).toContain(s.heading);
    expect(sourcesUrl(s)).toBe(`${SOURCE_URL}/blob/main/docs/dimensions.md#${githubAnchor(s.heading)}`);
    expect(DIMENSIONS_DOC_URL).toBe(`${SOURCE_URL}/blob/main/docs/dimensions.md`);
  });

  it("make the anchors GitHub gives headings", () => {
    expect(githubAnchor("Beam (liftarm)")).toBe("beam-liftarm");
    expect(githubAnchor("Brick and plate")).toBe("brick-and-plate");
    expect(githubAnchor("Half-height beam (thin liftarm)")).toBe("half-height-beam-thin-liftarm");
  });

  // Every setting the parts use shows on some size, and no size names one they don't use.
  it.each(sections)("%s names exactly the fit settings its parts use", (_, s) => {
    const used = new Set(s.parts.flatMap((id) => requirePart(id).clearance));
    const named = new Set(s.rows.flatMap((r) => (r.setting ? [r.setting] : [])));
    expect(named).toEqual(used);
  });

  it.each(sections)("%s shows every size as a number", (_, s) => {
    const features = s.rows.map((r) => r.feature);
    expect(new Set(features).size).toBe(features.length); // also React's keys
    for (const r of s.rows) expect(r.size).not.toMatch(/NaN|undefined|Infinity|\d\.\d{3}/);
  });

  it("quotes the sizes in spec.ts, as the docs write them", () => {
    expect(rowOf("beam", "Counterbore, both faces")?.size).toBe(`${SPEC.cboreD} × ${SPEC.cboreDepth} deep`);
    expect(rowOf("axle", "Stop")?.size).toBe(`${SPEC.collarD.toFixed(1)} × ${AXLE.stopThickness}`);
    expect(rowOf("brick", "Studs")?.size).toBe(`${BRICK.studD} × ${BRICK.studHeight}`);
    expect(rowOf("brick", "Tubes, two or more studs wide")?.size).toBe(
      `${BRICK.tubeD.toFixed(2)} outside, ${BRICK.tubeBoreD} inside`,
    );
    expect(rowOf("brick", "Ribs, two or more studs wide")?.size).toBe(`0.6 wide, 0.3 deep, on 1.2 walls`);
    expect(rowOf("brick", "Walls, one stud wide")?.size).toBe(`4.8 apart (1.5 thick)`);
    expect(rowOf("brick-with-holes", "Hole centre")?.size).toBe(`${BRICK.holeHeight} above the bottom`);
    expect(rowOf("brick-with-holes", "Boss round each hole, inside")?.size).toContain("2.2 above the bottom");
  });

  it("name no trademarks (they are shown in the app)", () => {
    const text = JSON.stringify(DIMENSION_SECTIONS);
    expect(text).not.toMatch(/lego|technic/i);
  });
});
