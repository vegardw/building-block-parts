import "./openCascade";
import { describe, it, expect } from "vitest";
import { getOC } from "replicad";
import { engineLoadError, kernelError, nameExceptionsWith, runKernel } from "../src/kernelError";
import { BUILDERS } from "../src/parts/builders";
import { NO_CLEARANCE } from "../src/spec";

const READABLE = /^The CAD engine could not build this part \(.+\)\. Try slightly different values/;

describe("kernelError", () => {
  it("turns a WebAssembly.Exception (how OpenCascade fails) into a readable message", () => {
    const wasmException = new WebAssembly.Exception(new WebAssembly.Tag({ parameters: [] }), []);
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- that useless text is the point
    expect(String(wasmException)).toBe("[object WebAssembly.Exception]"); // what the user would have seen
    expect(kernelError(wasmException, "build this part").message).toMatch(READABLE);
    expect(kernelError(wasmException, "build this part").message).toContain("(internal error)");
  });

  it("keeps the message of an ordinary Error", () => {
    expect(kernelError(new Error("Shape is null"), "build this part").message).toContain("(Shape is null)");
  });

  it("handles thrown non-errors", () => {
    expect(kernelError(42, "build this part").message).toMatch(READABLE);
  });
});

describe("runKernel", () => {
  it("passes results through", async () => {
    expect(runKernel("build this part", () => 7)).toBe(7);
    await expect(runKernel("build this part", () => Promise.resolve(7))).resolves.toBe(7);
  });

  it("rewrites synchronous and asynchronous failures", async () => {
    expect(() =>
      runKernel("build this part", () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- a non-Error, like the kernel's exceptions
        throw 1;
      }),
    ).toThrow(READABLE);
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a non-Error on purpose
    await expect(runKernel("build this part", () => Promise.reject(1))).rejects.toThrow(READABLE);
  });

  // A real kernel failure: a negative hole radius, which validation normally prevents.
  it("rewrites a real OpenCascade failure", () => {
    const negativeHole = { ...NO_CLEARANCE, hole: -6 };
    expect(() => BUILDERS.beam!({ holes: 3, height: 0 }, negativeHole)).toThrow(); // raw, unreadable
    expect(() => runKernel("build this part", () => BUILDERS.beam!({ holes: 3, height: 0 }, negativeHole))).toThrow(
      READABLE,
    );
  });
});

describe("OpenCascade's exceptions", () => {
  it("are named in the message", () => {
    const negativeHole = { ...NO_CLEARANCE, hole: -6 };
    expect(() => runKernel("build this part", () => BUILDERS.beam!({ holes: 3, height: 0 }, negativeHole))).toThrow(
      "(Standard_ConstructionError)",
    );
  });

  it("say so when the engine runs out of memory", () => {
    const exception = new WebAssembly.Exception(new WebAssembly.Tag({ parameters: [] }), []);
    for (const type of ["std::bad_alloc", "Standard_OutOfMemory"]) {
      nameExceptionsWith({ getExceptionMessage: () => [type, type] });
      expect(kernelError(exception, "export the STL file").message).toBe(
        "The CAD engine ran out of memory trying to export the STL file. Reload the page to start it afresh, close other tabs or apps, and put fewer parts in one file.",
      );
    }
    nameExceptionsWith(getOC()); // back to the real engine
  });
});

describe("engineLoadError", () => {
  // The engine's loader wraps every cause in "Aborted(...)".
  const aborted = (cause: string) =>
    new WebAssembly.RuntimeError(`Aborted(${cause}). Build with -sASSERTIONS for more info.`);

  it("names the browsers that work when the engine doesn't compile", () => {
    expect(engineLoadError(aborted("CompileError: WebAssembly.instantiate(): invalid opcode 0x6")).message).toMatch(
      /^This browser can't run the CAD engine \(.*invalid opcode.*\)\. Use a current browser \(Chrome or Edge 95/,
    );
  });

  it("says when there isn't enough memory to start", () => {
    for (const cause of [
      "RangeError: WebAssembly.Memory(): could not allocate memory", // Chrome
      "RangeError: Out of memory", // Safari
      "out of memory", // Firefox
    ]) {
      expect(engineLoadError(aborted(cause)).message).toMatch(/^There isn't enough memory to start the CAD engine/);
    }
  });

  it("says when the engine couldn't be downloaded", () => {
    expect(engineLoadError(aborted("both async and sync fetching of the wasm failed")).message).toBe(
      "Could not download the CAD engine. Check the connection, then reload the page.",
    );
  });

  it("passes anything else through", () => {
    expect(engineLoadError(new Error("something else")).message).toBe("Could not load the CAD engine: something else");
    expect(engineLoadError("text").message).toBe("Could not load the CAD engine: text");
  });
});
