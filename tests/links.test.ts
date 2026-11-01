import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SOURCE_URL } from "../src/links";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  repository: { type: string; url: string };
  bugs: { url: string };
};

describe("source repository address", () => {
  it("is an https address on GitHub", () => {
    expect(SOURCE_URL).toMatch(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
  });

  it("matches package.json's repository and bugs", () => {
    expect(pkg.repository).toEqual({ type: "git", url: `git+${SOURCE_URL}.git` });
    expect(pkg.bugs.url).toBe(`${SOURCE_URL}/issues`);
  });
});
