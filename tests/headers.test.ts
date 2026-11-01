import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { headersFor, parseHeadersFile, pathMatches } from "../scripts/headersFile";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const rules = parseHeadersFile(read("../public/_headers"));

// Paths the site serves (hashes made up), and what is set for each of them.
const PATHS = [
  "/",
  "/index.html",
  "/assets/index-C9F_umQQ.js",
  "/assets/worker-Bq5l4qPt.js",
  "/assets/replicad_single-B_1cTsn_.wasm",
  "/assets/index-RZTikRjC.css",
  "/favicon.svg",
  "/og-image.png",
  "/THIRD_PARTY_NOTICES.txt",
];
const header = (path: string, name: string) => headersFor(rules, path).find(([n]) => n === name)?.[1];
const csp = header("/", "Content-Security-Policy") ?? "";
const directive = (name: string) =>
  csp
    .split(";")
    .map((d) => d.trim().split(/\s+/))
    .find(([n]) => n === name)
    ?.slice(1);

describe("parseHeadersFile", () => {
  it("reads paths, headers and comments", () => {
    expect(parseHeadersFile("# comment\n/a/*\n  X-One: 1\n# another\n  X-Two: a: b\n\n/b\n  X-Three: 3\n")).toEqual([
      {
        path: "/a/*",
        headers: [
          ["X-One", "1"],
          ["X-Two", "a: b"],
        ],
      },
      { path: "/b", headers: [["X-Three", "3"]] },
    ]);
  });

  it("rejects a header before any path, and a line that is neither", () => {
    expect(() => parseHeadersFile("  X-One: 1\n")).toThrow("line 1");
    expect(() => parseHeadersFile("/a\n  no colon here\n")).toThrow("line 2");
  });

  it("matches `*` across slashes, and everything else literally", () => {
    expect(pathMatches("/*", "/assets/a/b.js")).toBe(true);
    expect(pathMatches("/assets/*", "/assets/x.wasm")).toBe(true);
    expect(pathMatches("/assets/*", "/favicon.svg")).toBe(false);
    expect(pathMatches("/index.html", "/indexXhtml")).toBe(false);
    expect(pathMatches("/", "/favicon.svg")).toBe(false);
  });
});

describe("public/_headers", () => {
  it("sets each header once per path (the hosts would join two values into one header)", () => {
    for (const path of PATHS) {
      const names = headersFor(rules, path).map(([n]) => n.toLowerCase());
      expect(names, path).toEqual([...new Set(names)]);
    }
  });

  it("sends the security headers with everything, the worker's script included", () => {
    for (const path of PATHS) {
      expect(header(path, "Content-Security-Policy"), path).toBe(csp);
      expect(header(path, "X-Content-Type-Options"), path).toBe("nosniff");
      expect(header(path, "X-Frame-Options"), path).toBe("DENY");
    }
  });

  it("allows only the site's own files, and what the engine needs to run", () => {
    expect(directive("default-src")).toEqual(["'self'"]);
    expect(directive("script-src")).toEqual(["'self'", "'unsafe-eval'", "'wasm-unsafe-eval'"]);
    expect(directive("worker-src")).toEqual(["'self'"]);
    expect(directive("style-src")).toEqual(["'self'"]);
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("frame-ancestors")).toEqual(["'none'"]);
    expect(csp).not.toContain("unsafe-inline");
  });

  it("needs 'unsafe-eval' only because the engine's bindings build functions at run time", () => {
    // If this fails, a new engine build no longer uses `new Function`: drop 'unsafe-eval' from the policy.
    expect(read("../node_modules/replicad-opencascadejs/dist/replicad_single.js")).toContain("new Function");
  });

  it("caches the built files for a year and always checks the page", () => {
    for (const path of PATHS.filter((p) => p.startsWith("/assets/"))) {
      expect(header(path, "Cache-Control"), path).toBe("public, max-age=31536000, immutable");
    }
    expect(header("/", "Cache-Control")).toBe("no-cache");
    expect(header("/index.html", "Cache-Control")).toBe("no-cache");
    expect(header("/favicon.svg", "Cache-Control")).toBeUndefined(); // the host's default: revalidate
  });

  it("matches a page without inline styles or scripts, which the policy would block", () => {
    const html = read("../index.html");
    expect(html).not.toMatch(/\sstyle=/);
    expect(html.match(/<script(?![^>]*\ssrc=)[^>]*>/g)).toBeNull();
  });
});
