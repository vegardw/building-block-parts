// Keeps the last built shape so previewing and then downloading builds it once,
// and frees the replaced shape's WebAssembly memory straight away instead of
// waiting for the garbage collector. Pure TS: the builder is passed in.

interface Deletable {
  delete?: () => void;
}

// Frees a replicad shape's WASM memory. Safe to call on an already deleted shape.
export function disposeQuietly(shape: Deletable | null | undefined): void {
  try {
    shape?.delete?.();
  } catch {
    // already deleted
  }
}

// build(request) => shape. Requests are compared by value.
export function createShapeCache<Request, Shape extends Deletable>(build: (request: Request) => Shape) {
  let key: string | null = null;
  let shape: Shape | null = null;

  return {
    has: (request: Request): boolean => shape !== null && JSON.stringify(request) === key,

    get(request: Request): Shape {
      const nextKey = JSON.stringify(request);
      if (shape !== null && nextKey === key) return shape;

      // If the build throws, the previous shape stays cached and untouched.
      const next = build(request);
      const previous = shape;
      shape = next;
      key = nextKey;
      disposeQuietly(previous);
      return next;
    },

    clear(): void {
      disposeQuietly(shape);
      shape = null;
      key = null;
    },
  };
}
