// The CAD engine's worker, replaced by a fresh one once its memory passes a limit
// (pure: `start` makes the worker). The engine keeps a little memory after every
// boolean operation, and WebAssembly memory never shrinks, so a long session would
// grow without end; only a new worker gives the memory back (docs/architecture.md,
// "Memory"). The page checks between jobs (the scheduler runs one at a time), so
// no job is lost; the next one waits while the new worker loads the engine from
// the cache.

type ErrorListener = (event: ErrorEvent) => void;

export interface EngineWorker {
  terminate(): void;
  addEventListener(type: "error", listener: ErrorListener): void;
  removeEventListener(type: "error", listener: ErrorListener): void;
}

export interface Engine<Api> {
  api(): Api; // the current worker's functions: call it for every job, it changes
  onError(listener: ErrorListener): () => void; // a worker's error events, whichever worker; returns the unsubscribe
  recycleIfFull(): Promise<boolean>; // between jobs: replaces the worker if its memory is past the limit
}

export function createEngine<Api extends { heapSize(): Promise<number> }>(
  start: () => { worker: EngineWorker; api: Api },
  limit: number,
): Engine<Api> {
  let current = start();
  const listeners = new Set<ErrorListener>();
  const forward: ErrorListener = (event) => {
    for (const listener of listeners) listener(event);
  };
  current.worker.addEventListener("error", forward);
  return {
    api: () => current.api,
    onError(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async recycleIfFull() {
      // A worker that can't say (it failed) is left alone: its error shows the usual way.
      const size = await current.api.heapSize().catch(() => 0);
      if (size < limit) return false;
      current.worker.removeEventListener("error", forward);
      current.worker.terminate();
      current = start();
      current.worker.addEventListener("error", forward);
      return true;
    },
  };
}

// An engine without a worker, for a browser that can't run one: every call fails with `api`'s message.
export const noEngine = <Api>(api: Api): Engine<Api> => ({
  api: () => api,
  onError: () => () => undefined,
  recycleIfFull: () => Promise.resolve(false),
});
