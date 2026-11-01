import { describe, it, expect } from "vitest";
import { createEngine, noEngine, type EngineWorker } from "../src/engine";

// A fake worker whose engine reports `heap` bytes, and records what happens to it.
function fakeStart(heaps: number[]) {
  const made: { worker: EngineWorker & { terminated: boolean; fire(): void; listening: number }; heap: number }[] = [];
  const start = () => {
    const listeners = new Set<(e: ErrorEvent) => void>();
    const worker = {
      terminated: false,
      terminate() {
        this.terminated = true;
      },
      addEventListener: (_: "error", l: (e: ErrorEvent) => void) => void listeners.add(l),
      removeEventListener: (_: "error", l: (e: ErrorEvent) => void) => void listeners.delete(l),
      fire: () => {
        for (const l of listeners) l({ message: `worker ${made.length}` } as ErrorEvent);
      },
      get listening() {
        return listeners.size;
      },
    };
    const entry = { worker, heap: heaps[made.length] ?? 0 };
    made.push(entry);
    return { worker, api: { id: made.length, heapSize: () => Promise.resolve(entry.heap) } };
  };
  return { start, made };
}

describe("createEngine", () => {
  it("starts one worker and keeps it while its memory is under the limit", async () => {
    const { start, made } = fakeStart([100, 100]);
    const engine = createEngine(start, 512);
    expect(await engine.recycleIfFull()).toBe(false);
    expect(made).toHaveLength(1);
    expect(engine.api().id).toBe(1);
  });

  it("replaces a worker that has reached the limit, ending the old one", async () => {
    const { start, made } = fakeStart([600, 100]);
    const engine = createEngine(start, 512);
    expect(await engine.recycleIfFull()).toBe(true);
    expect(made).toHaveLength(2);
    expect(made[0]!.worker).toMatchObject({ terminated: true, listening: 0 });
    expect(engine.api().id).toBe(2); // jobs now go to the new worker
    expect(await engine.recycleIfFull()).toBe(false);
  });

  it("passes on error events from whichever worker is current", async () => {
    const { start, made } = fakeStart([600, 100]);
    const engine = createEngine(start, 512);
    const seen: string[] = [];
    const stop = engine.onError((e) => seen.push(e.message));
    made[0]!.worker.fire();
    await engine.recycleIfFull();
    made[0]!.worker.fire(); // the old one is no longer listened to
    made[1]!.worker.fire();
    stop();
    made[1]!.worker.fire();
    expect(seen).toEqual(["worker 1", "worker 2"]);
  });

  it("leaves a worker alone that can't report its memory", async () => {
    const engine = createEngine(
      () => ({
        worker: { terminate: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined },
        api: { heapSize: () => Promise.reject(new Error("engine failed")) },
      }),
      512,
    );
    expect(await engine.recycleIfFull()).toBe(false);
  });
});

describe("noEngine", () => {
  it("passes calls to the given functions and never replaces anything", async () => {
    const api = { heapSize: () => Promise.reject(new Error("unsupported")) };
    const engine = noEngine(api);
    expect(engine.api()).toBe(api);
    expect(await engine.recycleIfFull()).toBe(false);
    expect(() => engine.onError(() => undefined)()).not.toThrow();
  });
});
