// Makes the README screenshot (docs/screenshot.png) and the link-preview card
// (public/og-image.png, 1200 × 630) from the production build, in Playwright's
// Chromium. Run `npm run screenshots` after changing the UI; it builds first.
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4178;
const BASE = `http://localhost:${PORT}/`;
const BEAM = "#parts/beam?holes=7&height=0";
// The parts on the card: a beam, an axle with a stop, a 3L friction pin.
const CARD_PARTS = { beam: BEAM, axle: "#parts/axle?length=6&endA=0&endB=2", pin: "#parts/pin?sideA=2&sideB=3&ends=0" };

async function waitForServer() {
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("vite preview didn't start");
}

// The page with a part in its 3D view, once the view has settled.
async function openPart(browser, hash, options) {
  const page = await browser.newPage(options);
  await page.goto(BASE + hash);
  await page.locator(".viewer canvas").waitFor({ timeout: 90_000 });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(2500);
  return page;
}

// The app at 1280 px wide, from the top to just below the preview (which is as
// tall as the window, so the model is in view), without the empty side margins.
async function readmeScreenshot(browser) {
  const width = 1280;
  const page = await openPart(browser, BEAM, { viewport: { width, height: 640 } });
  const box = await page.locator(".viewer").boundingBox();
  const right = Math.ceil(box.x + box.width + 32);
  await page.screenshot({
    path: join(root, "docs", "screenshot.png"),
    fullPage: true,
    clip: { x: width - right, y: 0, width: 2 * right - width, height: Math.ceil(box.y + box.height + 32) },
  });
  await page.close();
}

// Each part alone on a transparent background, as base64 PNG. The CSP is bypassed
// only to restyle the page for the capture.
async function renderPart(browser, hash) {
  const page = await openPart(browser, hash, {
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 2,
    bypassCSP: true,
  });
  await page.addStyleTag({
    content:
      "*{background:transparent!important;border-color:transparent!important;box-shadow:none!important}" +
      "body *{visibility:hidden!important} .viewer canvas{visibility:visible!important}",
  });
  await page.waitForTimeout(500);
  const png = await page.locator(".viewer canvas").screenshot({ omitBackground: true });
  await page.close();
  return png.toString("base64");
}

// The card: the name and what it makes on the left, the parts on the right. No
// trademarks: the card works like a heading (see "Names and trademarks" in CONTRIBUTING.md).
const CARD = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #f7f8fa; color: #1c2024; position: relative;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  .text { position: absolute; left: 72px; top: 92px; width: 520px; }
  h1 { font-size: 58px; line-height: 1.08; letter-spacing: -0.02em; font-weight: 750; }
  p { margin-top: 26px; font-size: 26px; line-height: 1.4; color: #5d6679; }
  .tags { position: absolute; left: 72px; bottom: 72px; display: flex; gap: 12px; }
  .tags span { font-size: 20px; font-weight: 600; color: #2f6f95; border: 2px solid #2f6f95; border-radius: 999px; padding: 6px 18px; }
  .panel { position: absolute; right: 48px; top: 48px; width: 532px; height: 534px; background: #fff; border: 1px solid #e3e6eb; border-radius: 24px; }
  canvas { position: absolute; }
</style></head><body>
  <div class="text"><h1>Building Block Parts Generator</h1>
    <p>Beams, axles and pins as STEP files with true curves, for 3D printing and CNC.</p></div>
  <div class="tags"><span>STEP</span><span>STL</span><span>Calibrated fit</span></div>
  <div class="panel"></div>
</body></html>`;

// Trims a render to its opaque pixels and draws it centred in a box (runs in the page).
async function place([b64, x, y, w, h]) {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const { data } = g.getImageData(0, 0, c.width, c.height);
  let [x0, y0, x1, y1] = [c.width, c.height, 0, 0];
  for (let j = 0; j < c.height; j++) {
    for (let i = 0; i < c.width; i++) {
      if (data[(j * c.width + i) * 4 + 3] > 8)
        [x0, y0, x1, y1] = [Math.min(x0, i), Math.min(y0, j), Math.max(x1, i), Math.max(y1, j)];
    }
  }
  const [cw, ch] = [x1 - x0 + 1, y1 - y0 + 1];
  const s = Math.min(w / cw, h / ch);
  const out = document.createElement("canvas");
  [out.width, out.height] = [Math.round(cw * s * 2), Math.round(ch * s * 2)];
  Object.assign(out.style, {
    width: `${cw * s}px`,
    height: `${ch * s}px`,
    left: `${x + (w - cw * s) / 2}px`,
    top: `${y + (h - ch * s) / 2}px`,
  });
  const o = out.getContext("2d");
  o.imageSmoothingQuality = "high";
  o.drawImage(c, x0, y0, cw, ch, 0, 0, out.width, out.height);
  document.body.appendChild(out);
}

async function card(browser) {
  const renders = {};
  for (const [name, hash] of Object.entries(CARD_PARTS)) renders[name] = await renderPart(browser, hash);
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(CARD);
  await page.evaluate(place, [renders.beam, 652, 80, 468, 230]);
  await page.evaluate(place, [renders.axle, 652, 330, 290, 220]);
  await page.evaluate(place, [renders.pin, 958, 350, 170, 190]);
  await page.screenshot({ path: join(root, "public", "og-image.png") });
  await page.close();
}

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: root,
  stdio: "ignore",
});
try {
  await waitForServer();
  // Headless Chromium draws WebGL in software only when allowed to.
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  await readmeScreenshot(browser);
  await card(browser);
  await browser.close();
  console.log("Wrote docs/screenshot.png and public/og-image.png");
} finally {
  server.kill();
}
