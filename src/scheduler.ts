// Runs the CAD worker's jobs one at a time, in the order the app wants them
// (pure). There are two kinds:
// - preview(value): while a job runs, only the newest waiting preview is kept;
//   older waiting ones resolve to SKIPPED without running. This stops a burst
//   of changes (typing, holding a −/+ button) from queueing many builds.
// - always(job): a download. It is never skipped, and runs after the job that is
//   running but before a waiting preview: the user asked for that file.
// The worker would run overlapping calls in arrival order anyway, but only while
// each of its functions stays synchronous after loading; here the order and the
// one-at-a-time rule are explicit, so a job can never meet a shape that another
// job has freed.
export const SKIPPED = Symbol("skipped");

interface Waiting<Value, Result> {
  value: Value;
  resolve: (result: Result | typeof SKIPPED) => void;
  reject: (error: unknown) => void;
}

export interface Scheduler<Value, Result> {
  preview(value: Value): Promise<Result | typeof SKIPPED>;
  always<T>(job: () => Promise<T>): Promise<T>;
}

export function createScheduler<Value, Result>(
  runPreview: (value: Value) => Promise<Result>,
): Scheduler<Value, Result> {
  let running = false;
  let preview: Waiting<Value, Result> | null = null;
  const queue: (() => Promise<void>)[] = []; // `always` jobs, first come first served

  async function pump(): Promise<void> {
    if (running) return;
    running = true;
    for (;;) {
      const next = queue.shift();
      if (next) {
        await next(); // settles its own promise; never throws
        continue;
      }
      if (!preview) break;
      const { value, resolve, reject } = preview;
      preview = null;
      try {
        resolve(await runPreview(value));
      } catch (error) {
        reject(error);
      }
    }
    running = false;
  }

  return {
    preview: (value) =>
      new Promise((resolve, reject) => {
        preview?.resolve(SKIPPED);
        preview = { value, resolve, reject };
        void pump();
      }),
    always: (job) =>
      new Promise((resolve, reject) => {
        // Started from a promise, so a job that throws before returning one rejects too.
        queue.push(() => Promise.resolve().then(job).then(resolve, reject));
        void pump();
      }),
  };
}
