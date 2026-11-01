// Loads the OpenCascade WASM module in Node and hands it to replicad.
// Import this file from any test that builds shapes.
import { beforeAll } from "vitest";
import { createRequire } from "node:module";
import opencascade from "replicad-opencascadejs";
import { setOC } from "replicad";
import { nameExceptionsWith } from "../src/kernelError";

declare global {
  var __replicadReady: boolean | undefined;
}

async function loadOpenCascade(): Promise<Awaited<ReturnType<typeof opencascade>>> {
  try {
    // In Node, Emscripten normally finds the .wasm file next to its JS file.
    return await opencascade();
  } catch (firstError) {
    // Fall back to an explicit path to the .wasm file.
    let wasmPath: string;
    try {
      wasmPath = createRequire(import.meta.url).resolve("replicad-opencascadejs/wasm");
    } catch {
      throw firstError;
    }
    return opencascade({ locateFile: () => wasmPath });
  }
}

beforeAll(async () => {
  if (globalThis.__replicadReady) return;
  const oc = await loadOpenCascade();
  setOC(oc);
  nameExceptionsWith(oc); // as the worker does
  globalThis.__replicadReady = true;
});
