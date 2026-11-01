// Turns CAD kernel failures into messages a user can act on (pure, no CAD import).
//
// OpenCascade runs as WebAssembly and fails by throwing a WebAssembly.Exception,
// which has no message: shown as is, the user would read "[object WebAssembly.Exception]".
import { SUPPORTED_BROWSERS } from "./browserSupport";

// The engine's own helper that reads the C++ exception inside a WebAssembly.Exception:
// its type ("Standard_ConstructionError", "std::bad_alloc") and message.
interface ExceptionReader {
  getExceptionMessage(e: WebAssembly.Exception): [string, string];
}
let reader: ExceptionReader | null = null;

// Called once the engine has loaded (the worker, and tests/openCascade.ts).
export function nameExceptionsWith(engine: ExceptionReader | null): void {
  reader = engine;
}

// "Standard_ConstructionError", or with its message if it has one; null if not an engine exception.
function exceptionName(e: unknown): string | null {
  if (!reader || typeof WebAssembly === "undefined" || !(e instanceof WebAssembly.Exception)) return null;
  try {
    const [type, message] = reader.getExceptionMessage(e);
    return message && message !== type ? `${type}: ${message}` : type;
  } catch {
    return null; // not one of the engine's C++ exceptions
  }
}

// The heap can't grow (C++ `new` fails, or OpenCascade's own allocator), or the
// browser can't give the engine its memory at all ("could not allocate memory" in
// Chrome, "out of memory" in Firefox and Safari).
const OUT_OF_MEMORY = /bad_alloc|Standard_OutOfMemory|out of memory|could not allocate/i;

export function kernelError(e: unknown, action: string): Error {
  const detail = exceptionName(e) ?? (e instanceof Error && e.message ? e.message : "internal error");
  if (OUT_OF_MEMORY.test(detail)) {
    return new Error(
      `The CAD engine ran out of memory trying to ${action}. Reload the page to start it afresh, close other tabs or apps, and put fewer parts in one file.`,
    );
  }
  return new Error(
    `The CAD engine could not ${action} (${detail}). Try slightly different values; if it keeps failing, please report it.`,
  );
}

// Runs one kernel operation and rethrows a failure as a readable Error, also
// when the operation returns a promise that rejects (e.g. blobSTEP).
export function runKernel<T>(action: string, operation: () => T): T {
  let result: T;
  try {
    result = operation();
  } catch (e) {
    throw kernelError(e, action);
  }
  if (result instanceof Promise) {
    return result.catch((e: unknown) => {
      throw kernelError(e, action);
    }) as T;
  }
  return result;
}

// Loading the engine failed. The engine's loader wraps every cause in
// "Aborted(<cause>)", so the cause is read from the message.
export function engineLoadError(e: unknown): Error {
  const message = e instanceof Error ? e.message : String(e);
  if (/CompileError|LinkError/.test(message)) {
    return new Error(
      `This browser can't run the CAD engine (${message}). Use a current browser (${SUPPORTED_BROWSERS}).`,
    );
  }
  if (OUT_OF_MEMORY.test(message)) {
    // The engine starts with a 100 MB heap (the WebAssembly file's initial memory).
    return new Error(
      "There isn't enough memory to start the CAD engine (it needs about 100 MB). Close other tabs or apps, then reload the page.",
    );
  }
  if (/fetching of the wasm failed|Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return new Error("Could not download the CAD engine. Check the connection, then reload the page.");
  }
  return new Error(`Could not load the CAD engine: ${message}`);
}
