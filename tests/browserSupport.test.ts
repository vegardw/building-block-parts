import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { FEATURE_MODULES, SUPPORTED_BROWSERS, engineUnsupported } from "../src/browserSupport";

// A WebAssembly that rejects the given feature module, as a browser without that feature would.
const without = (module: Uint8Array) => ({
  WebAssembly: { validate: (bytes: BufferSource) => bytes !== module && WebAssembly.validate(bytes) },
});

describe("engineUnsupported", () => {
  it("passes in this Node, which has every feature the engine uses", () => {
    expect(WebAssembly.validate(FEATURE_MODULES.SIMD)).toBe(true);
    expect(WebAssembly.validate(FEATURE_MODULES.EXCEPTIONS)).toBe(true);
    expect(engineUnsupported()).toBeNull();
  });

  it("names what is missing and the browsers that work", () => {
    expect(engineUnsupported({})).toMatch(/lacks WebAssembly\./);
    expect(engineUnsupported(without(FEATURE_MODULES.SIMD))).toMatch(/lacks WebAssembly SIMD\./);
    expect(engineUnsupported(without(FEATURE_MODULES.EXCEPTIONS))).toMatch(/lacks WebAssembly exception handling\./);
    expect(engineUnsupported({})).toContain(SUPPORTED_BROWSERS);
  });

  it("treats a validate that throws as missing", () => {
    const throwing = {
      validate: (): boolean => {
        throw new TypeError("not supported");
      },
    };
    expect(engineUnsupported({ WebAssembly: throwing })).toMatch(/lacks WebAssembly SIMD/);
  });

  // The engine uses the legacy exception-handling encoding (it doesn't validate
  // without it, and does without exnref), so the check must test that one.
  it("tests the exception-handling encoding the engine uses", () => {
    const script = `process.stdout.write(String(WebAssembly.validate(new Uint8Array(${JSON.stringify([...FEATURE_MODULES.EXCEPTIONS])}))))`;
    const run = (flag: string) => spawnSync(process.execPath, [flag, "-e", script], { encoding: "utf8" }).stdout;
    expect(run("--no-experimental-wasm-legacy-eh")).toBe("false");
    expect(run("--no-experimental-wasm-exnref")).toBe("true");
  });
});
