import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// The browser smoke test (e2e/): the production build, served by `vite preview`
// with the site's headers (public/_headers), in Chromium, Firefox and WebKit
// (Safari's engine). Run it with `npm run test:browser`; the first time, install
// the browsers with `npx playwright install` (`--with-deps` on Linux).
const PORT = 4173;

// macOS 27 refuses Playwright's Firefox (157, Playwright 1.64.1) its
// ~/Library/Application Support folder, which it reads even with its own
// profile, so it exits with "Could not find profile folder". An empty home
// folder of its own lets it start. Firefox 158 is said to fix it: drop this
// once Playwright ships it and Firefox starts without it.
const firefoxEnv =
  process.platform === "darwin"
    ? { env: { ...process.env, CFFIXED_USER_HOME: mkdtempSync(join(tmpdir(), "playwright-firefox-home-")) } }
    : {};

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000, // each test loads the 23 MB engine
  expect: { timeout: 60_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, acceptDownloads: true },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    // Headless Chromium draws WebGL in software only when allowed to.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--enable-unsafe-swiftshader"] } },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"], launchOptions: firefoxEnv } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
