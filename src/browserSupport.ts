// Whether this browser can run the CAD engine (pure; the globals are passed in
// for tests). OpenCascade's WebAssembly build uses SIMD and exception handling
// (the legacy encoding), plus bulk memory, sign extension and non-trapping float
// conversion, which every browser with the first two also has. Without them the
// browser would download the 7 MB engine and then fail with an unreadable error,
// so this runs first. The engine also needs module workers (Firefox 114); a
// browser without them fails when the worker is created (see App.tsx).

export const SUPPORTED_BROWSERS = "Chrome or Edge 95, Firefox 114 or Safari 16.4, or newer";

export const unsupportedMessage = (missing: string): string =>
  `This browser can't run the CAD engine: it lacks ${missing}. Use a current browser (${SUPPORTED_BROWSERS}).`;

// Two tiny modules, each with one function that uses one feature; WebAssembly.validate
// checks them without compiling the engine.
const HEADER = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
const ONE_FUNCTION = [0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x03, 0x02, 0x01, 0x00]; // type () -> (), one function of it
// The code section around the function's body (no locals, its instructions, end).
const moduleWith = (body: number[]) =>
  new Uint8Array([...HEADER, ...ONE_FUNCTION, 0x0a, body.length + 2, 0x01, body.length, ...body]);
const SIMD = moduleWith([0x00, 0x41, 0x00, 0xfd, 0x0f, 0x1a, 0x0b]); // i32.const 0, i8x16.splat, drop
const EXCEPTIONS = moduleWith([0x00, 0x06, 0x40, 0x19, 0x0b, 0x0b]); // try, catch_all, end (legacy, as the engine)
export const FEATURE_MODULES = { SIMD, EXCEPTIONS }; // for the tests

interface Env {
  WebAssembly?: Pick<typeof WebAssembly, "validate"> | undefined;
}

const validates = (wasm: Pick<typeof WebAssembly, "validate">, bytes: BufferSource): boolean => {
  try {
    return wasm.validate(bytes);
  } catch {
    return false;
  }
};

// null if the engine can run here, otherwise the message to show instead.
export function engineUnsupported(env: Env = globalThis): string | null {
  const wasm = env.WebAssembly;
  if (!wasm || typeof wasm.validate !== "function") return unsupportedMessage("WebAssembly");
  if (!validates(wasm, SIMD)) return unsupportedMessage("WebAssembly SIMD");
  if (!validates(wasm, EXCEPTIONS)) return unsupportedMessage("WebAssembly exception handling");
  return null;
}
