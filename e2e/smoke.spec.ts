// Browser smoke test: the built app in a real browser, under the site's headers.
// It loads the engine, builds a part, downloads it and reads the file back with
// the same analysers as the unit tests, so a broken bundle, worker, CSP or
// download shows up before deploying. Run with `npm run test:browser`.
import { readFile } from "node:fs/promises";
import { test, expect, type Download, type Page } from "@playwright/test";

import { analyseStep, stepGeometry } from "../tests/stepStats";
import { analyseStl } from "../tests/stlStats";
import { expectedBeam, gaps, measureBeam, NOMINAL } from "../tests/beamGeometry";
import { SOURCE_URL } from "../src/links";

const EXACT_FACES = ["PLANE", "CYLINDRICAL_SURFACE"];
const EXACT_EDGES = ["LINE", "CIRCLE", "ELLIPSE"];

// Fails the test on any page error, console error or CSP violation. Warnings are
// left alone (three.js logs a deprecation notice for THREE.Clock).
let problems: string[] = [];
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console error: ${m.text()}`);
  });
  await page.exposeFunction("reportViolation", (text: string) => problems.push(`CSP: ${text}`));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      void (window as unknown as { reportViolation: (t: string) => Promise<void> }).reportViolation(
        `${e.violatedDirective} blocked ${e.blockedURI || "inline"}`,
      );
    });
  });
});
test.afterEach(() => {
  expect(problems).toEqual([]);
});

// Waits until the engine is ready, or fails at once with the error the app shows instead.
async function engineReady(page: Page, format: "STEP" | "STL" = "STEP") {
  const ready = page.getByRole("button", { name: `Download ${format}`, disabled: false });
  await expect(ready.or(page.getByRole("alert")).first()).toBeVisible({ timeout: 90_000 });
  expect(await page.getByRole("alert").allTextContents(), "the app shows an error").toEqual([]);
}

async function download(page: Page, button: string): Promise<{ file: Download; bytes: Buffer }> {
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: button }).click()]);
  const path = await file.path();
  return { file, bytes: await readFile(path) };
}

test("a beam: loads, previews and downloads a STEP file with exact geometry, under the site's headers", async ({
  page,
}) => {
  const response = await page.goto("/#parts/beam?holes=5&height=0");
  expect(response?.headers()["content-security-policy"]).toContain("script-src 'self'");
  await engineReady(page);

  // The preview: the model's size, and the 3D view (or its message where the browser has no WebGL).
  await expect(page.locator(".view-size")).toContainText("39.2 × 7.2 × 8.0 mm");
  await expect(
    page.locator(".viewer canvas").or(page.getByText("The 3D preview isn't available")).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Source code on GitHub" })).toHaveAttribute("href", SOURCE_URL);

  // The part's dimensions open over the page, at its table, and close back to the part.
  await page.getByRole("link", { name: "See this part's dimensions" }).click();
  const dimensions = page.getByRole("dialog", { name: "Dimensions" });
  await expect(dimensions.getByRole("heading", { name: "Beam (liftarm)" })).toBeInViewport();
  await expect(dimensions.getByRole("link", { name: "Sources for Beam (liftarm)" })).toHaveAttribute(
    "href",
    `${SOURCE_URL}/blob/main/docs/dimensions.md#beam-liftarm`,
  );
  await dimensions.getByRole("button", { name: "Close" }).click();
  await expect(dimensions).toBeHidden();
  await expect(page).toHaveURL(/#parts\/beam\?holes=5&height=0$/);

  const { file, bytes } = await download(page, "Download STEP");
  expect(file.suggestedFilename()).toBe("beam-5-holes.step");
  const text = bytes.toString("utf8");
  const stats = analyseStep(text);
  expect(Object.keys(stats.faceTypes).filter((t) => !EXACT_FACES.includes(t))).toEqual([]);
  expect(Object.keys(stats.edgeTypes).filter((t) => !EXACT_EDGES.includes(t))).toEqual([]);
  const beam = measureBeam(stepGeometry(text));
  expect(beam).toMatchObject(expectedBeam(5));
  expect(gaps(beam.holeX)).toEqual([NOMINAL.pitch, NOMINAL.pitch, NOMINAL.pitch, NOMINAL.pitch]);
});

const stlOf = (bytes: Buffer) =>
  analyseStl(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
// The mesh lies within 0.001 mm of the surfaces, so a size can be that much short at each end.
const expectSize = (size: number[], expected: number[]) => {
  size.forEach((d, k) => expect(Math.abs(d - (expected[k] ?? 0)), `axis ${k}: ${d}`).toBeLessThan(0.003));
};

test("a beam as STL, alone and twice from the parts list: meshes of the right size", async ({ page }) => {
  await page.goto("/#parts/beam?holes=5&height=0");
  await engineReady(page);
  await page.getByText("STL", { exact: true }).click(); // the button-styled label over the radio input
  await expect(page.getByRole("radio", { name: "STL" })).toBeChecked();
  const single = await download(page, "Download STL");
  expect(single.file.suggestedFilename()).toBe("beam-5-holes.stl");
  const one = stlOf(single.bytes);
  expect(one.triangles).toBeGreaterThan(100);
  expectSize(one.size, [39.2, 7.2, 8]);

  // Two of the same beam: the part is meshed once and its triangles written twice, side by side.
  await page.getByRole("button", { name: "Add to list" }).click();
  await page.getByRole("button", { name: "Add to list" }).click();
  await expect(page.getByRole("textbox", { name: /^Number of / })).toHaveValue("2");
  const list = await download(page, "Download list as STL");
  expect(list.file.suggestedFilename()).toBe("parts-list.stl");
  const two = stlOf(list.bytes);
  expect(two.triangles).toBe(2 * one.triangles);
  expectSize(two.size, [2 * 39.2 + 8, 7.2, 8]);
  expect(two.volume / (2 * one.volume)).toBeCloseTo(1, 6);
});

test("Calibrate: all six calibration parts in one STEP file, and the brick check set", async ({ page }) => {
  await page.goto("/#calibrate/hole");
  await expect(page.getByRole("button", { name: "Download all calibration parts" })).toBeEnabled({
    timeout: 90_000,
  });
  const { file, bytes } = await download(page, "Download all calibration parts");
  expect(file.suggestedFilename()).toBe("calibration-parts.step");
  const text = bytes.toString("utf8");
  expect(text.match(/MANIFOLD_SOLID_BREP/g)).toHaveLength(6);
  const stats = analyseStep(text);
  expect(Object.keys(stats.faceTypes).filter((t) => !EXACT_FACES.includes(t))).toEqual([]);

  // The underside step's check set: four bricks made with the fit settings (nominal here).
  await page.goto("/#calibrate/underside");
  await expect(page.getByRole("button", { name: "Download the check set" })).toBeEnabled();
  const check = await download(page, "Download the check set");
  expect(check.file.suggestedFilename()).toBe("brick-check-set.step");
  const checkText = check.bytes.toString("utf8");
  expect(checkText.match(/MANIFOLD_SOLID_BREP/g)).toHaveLength(4);
  expect(Object.keys(analyseStep(checkText).faceTypes).filter((t) => !EXACT_FACES.includes(t))).toEqual([]);
});

test("a browser without WebAssembly SIMD gets a message, and no engine download", async ({ page }) => {
  // Fail the check's tiny SIMD module (it uses the 0xfd prefix), as an old browser would.
  await page.addInitScript(() => {
    const validate = WebAssembly.validate.bind(WebAssembly);
    WebAssembly.validate = (bytes) => {
      const view = ArrayBuffer.isView(bytes) ? new Uint8Array(bytes.buffer) : new Uint8Array(bytes);
      return view.length < 40 && view.includes(0xfd) ? false : validate(bytes);
    };
  });
  const engine: string[] = [];
  page.on("request", (r) => {
    if (/\.wasm$|\/worker-/.test(r.url())) engine.push(r.url());
  });
  await page.goto("/#parts/beam");
  await expect(page.getByRole("alert")).toContainText(
    "This browser can't run the CAD engine: it lacks WebAssembly SIMD",
  );
  await expect(page.getByRole("button", { name: "Reload page" })).toHaveCount(0);
  await expect(page.locator("#param-holes")).toBeVisible(); // the rest of the page still works
  expect(engine).toEqual([]);
});
