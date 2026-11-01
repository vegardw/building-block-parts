import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { siteUrlFrom } from "../scripts/siteAddress";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { homepage: string };

describe("site address", () => {
  it("is package.json's homepage, an https address without a trailing slash", () => {
    expect(pkg.homepage).toMatch(/^https:\/\/[\w.-]+$/);
    expect(siteUrlFrom(undefined, pkg.homepage)).toBe(pkg.homepage);
  });

  it("is overridden by SITE_URL, and an empty SITE_URL builds without one", () => {
    expect(siteUrlFrom("https://example.org/", pkg.homepage)).toBe("https://example.org");
    expect(siteUrlFrom("", pkg.homepage)).toBe("");
    expect(siteUrlFrom(undefined, undefined)).toBe("");
  });
});
