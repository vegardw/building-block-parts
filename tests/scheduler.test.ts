import { describe, it, expect, vi } from "vitest";
import { createScheduler, SKIPPED } from "../src/scheduler";

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
// A job taking a moment; a throw in fn rejects it, as a failing build would.
const slow = <T>(fn: () => T) => tick().then(fn);

// A scheduler whose previews record their order and check that no two jobs overlap.
function recorder() {
  const order: string[] = [];
  let active = 0;
  let overlapped = false;
  const track = <T>(name: string, fn: () => T) => {
    active += 1;
    if (active > 1) overlapped = true;
    return slow(() => {
      active -= 1;
      order.push(name);
      return fn();
    });
  };
  const runPreview = vi.fn((v: number) =>
    track(`preview ${v}`, () => {
      if (v < 0) throw new Error("boom");
      return v * 10;
    }),
  );
  return { order, runPreview, track, overlapped: () => overlapped, scheduler: createScheduler(runPreview) };
}

describe("scheduler: previews", () => {
  it("runs one at a time and skips all but the newest waiting one", async () => {
    const { scheduler, runPreview } = recorder();
    const results = await Promise.all([scheduler.preview(1), scheduler.preview(2), scheduler.preview(3)]);
    expect(results).toEqual([10, SKIPPED, 30]);
    expect(runPreview.mock.calls.map((c) => c[0])).toEqual([1, 3]);
  });

  it("rejects only the failing preview and keeps working", async () => {
    const { scheduler } = recorder();
    await expect(scheduler.preview(-1)).rejects.toThrow("boom");
    await expect(scheduler.preview(2)).resolves.toBe(20);
  });

  it("runs a preview asked for after an earlier one has finished", async () => {
    const { scheduler, runPreview } = recorder();
    await scheduler.preview(1);
    await scheduler.preview(2);
    expect(runPreview).toHaveBeenCalledTimes(2);
  });
});

describe("scheduler: downloads (always)", () => {
  it("runs a download after the running preview and before a waiting one", async () => {
    const { scheduler, order, track, overlapped } = recorder();
    const running = scheduler.preview(1);
    const waiting = scheduler.preview(2);
    const download = scheduler.always(() => track("download", () => "file"));
    expect(await Promise.all([running, waiting, download])).toEqual([10, 20, "file"]);
    expect(order).toEqual(["preview 1", "download", "preview 2"]);
    expect(overlapped()).toBe(false);
  });

  it("never skips a download, and runs them in the order asked", async () => {
    const { scheduler, order, track } = recorder();
    const downloads = [1, 2, 3].map((n) => scheduler.always(() => track(`download ${n}`, () => n)));
    const previews = [scheduler.preview(1), scheduler.preview(2)];
    expect(await Promise.all(downloads)).toEqual([1, 2, 3]);
    expect(await Promise.all(previews)).toEqual([SKIPPED, 20]);
    expect(order).toEqual(["download 1", "download 2", "download 3", "preview 2"]);
  });

  it("rejects only the failing download, also one that throws before returning a promise", async () => {
    const { scheduler } = recorder();
    const failing = scheduler.always(() => slow(() => Promise.reject(new Error("export failed"))));
    const throwing = scheduler.always((): Promise<never> => {
      throw new Error("no worker");
    });
    const next = scheduler.preview(1);
    await expect(failing).rejects.toThrow("export failed");
    await expect(throwing).rejects.toThrow("no worker");
    await expect(next).resolves.toBe(10);
    await expect(scheduler.always(() => slow(() => "ok"))).resolves.toBe("ok");
  });
});
