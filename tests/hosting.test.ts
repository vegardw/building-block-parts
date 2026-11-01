import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import viteConfig from "../vite.config";

// wrangler.jsonc is JSON with comments and trailing commas; this one has comments only on lines of their own.
const wrangler = JSON.parse(
  readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1"),
) as { name: string; main?: string; assets: { directory: string } };

describe("Cloudflare Workers settings", () => {
  it("serve the folder Vite builds into, as static assets without Worker code", () => {
    expect(wrangler.assets.directory).toBe(`./${viteConfig.build?.outDir ?? ""}`);
    expect(wrangler.main).toBeUndefined();
    expect(wrangler.name).toBe("building-block-parts");
  });
});
