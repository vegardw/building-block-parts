import opencascade from "replicad-opencascadejs";
import opencascadeWasm from "replicad-opencascadejs/wasm?url";
import { setOC } from "replicad";
import type { Shape3D } from "replicad";
import { expose, transfer } from "comlink";

import { buildPart, exportSet, exportShape, meshBuffers, previewMesh } from "./parts/builders";
import type { BuildRequest, FileFormat, MeshData, SetItem } from "./parts/types";
import { createShapeCache } from "./shapeCache";
import { engineLoadError, nameExceptionsWith } from "./kernelError";

// The functions the main thread can call (see wrap<CadApi> in App).
export interface CadApi {
  ready(): Promise<true>;
  createMesh(request: BuildRequest): Promise<MeshData>;
  createBlob(request: BuildRequest, format: FileFormat): Promise<Blob>;
  createSetBlob(items: SetItem[], format: FileFormat): Promise<Blob>;
  heapSize(): Promise<number>;
}

let heapBytes: () => number | undefined = () => undefined;
let loaded = false;

const init = async (): Promise<true> => {
  if (loaded) return true;

  const OC = await opencascade({
    locateFile: () => opencascadeWasm,
  });

  loaded = true;
  setOC(OC);
  nameExceptionsWith(OC); // failures then name the OpenCascade exception, and running out of memory says so
  heapBytes = () => OC.wasmMemory.buffer.byteLength; // the engine's heap (it grows, never shrinks)

  return true;
};

// Wrap load failures in a clear message (an old browser, too little memory, no
// connection). Every call below awaits `started`, so a failure reaches the UI
// instead of hanging.
const started = init().catch((e: unknown) => {
  throw engineLoadError(e);
});
started.catch(() => {
  // nothing to do: this only avoids an "unhandled rejection" log before the first call
});

// Lets the UI show "loading the engine" separately from "building the model".
async function ready(): Promise<true> {
  await started;
  return true;
}

// The last built shape is kept, so downloading right after previewing doesn't
// rebuild it, and the shape it replaces is freed explicitly.
const cache = createShapeCache(buildPart);

function shapeFor(request: BuildRequest): Shape3D {
  const hit = cache.has(request);
  const shape = cache.get(request);
  if (import.meta.env.DEV && !hit) {
    const bytes = heapBytes();
    const heap = bytes ? `${(bytes / 1048576).toFixed(0)} MB` : "unknown";
    console.debug(`[cad] built ${request.partId}; WASM heap ${heap}`);
  }
  return shape;
}

async function createBlob(request: BuildRequest, format: FileFormat): Promise<Blob> {
  await started;
  return exportShape(shapeFor(request), format);
}

// Several parts in one file ("Download all", the parts list). Built outside the
// cache, so the previewed shape stays cached.
async function createSetBlob(items: SetItem[], format: FileFormat): Promise<Blob> {
  await started;
  return exportSet(items, format);
}

// The preview's mesh, handed over to the page rather than copied.
async function createMesh(request: BuildRequest): Promise<MeshData> {
  await started;
  const mesh = previewMesh(shapeFor(request));
  return transfer(mesh, meshBuffers(mesh));
}

// The engine's memory in bytes, so the page can replace a worker whose memory has
// grown too much (engine.ts): the engine keeps a little after every boolean.
async function heapSize(): Promise<number> {
  await started;
  return heapBytes() ?? 0;
}

expose({ ready, createBlob, createSetBlob, createMesh, heapSize } satisfies CadApi);
