import { describe, it, expect } from "vitest";
import { KEYS, readStorage, writeStorage } from "../src/storage";

// A Map standing in for localStorage.
function fakeStore(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  const store = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  return { map, store: () => store };
}

describe("storage", () => {
  it("reads back what it wrote", () => {
    const { store } = fakeStore();
    writeStorage(KEYS.list, [{ partId: "beam" }], store);
    expect(readStorage(KEYS.list, store)).toEqual([{ partId: "beam" }]);
  });

  it("reads missing or corrupt data as null", () => {
    const { store } = fakeStore({ [KEYS.settings]: "{not json" });
    expect(readStorage(KEYS.list, store)).toBeNull();
    expect(readStorage(KEYS.settings, store)).toBeNull();
  });

  it("reads null and writes nothing when storage is blocked", () => {
    const blocked = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    expect(readStorage(KEYS.fit, blocked)).toBeNull();
    expect(() => writeStorage(KEYS.fit, {}, blocked)).not.toThrow();
  });

  it("moves the fit settings from the first version's key to the new one", () => {
    const saved = { hole: "0.1", width: "0", height: "0", axle: "0", pin: "0", collar: "0" };
    const { map, store } = fakeStore({ "beam-generator-clearance": JSON.stringify(saved) });
    expect(readStorage(KEYS.fit, store)).toEqual(saved); // read from the old key
    writeStorage(KEYS.fit, saved, store);
    expect([...map.keys()]).toEqual([KEYS.fit]); // the old key is gone
    expect(readStorage(KEYS.fit, store)).toEqual(saved);
  });

  it("prefers the new key once it exists", () => {
    const { store } = fakeStore({ "beam-generator-clearance": '{"hole":"0.3"}', [KEYS.fit]: '{"hole":"0.1"}' });
    expect(readStorage(KEYS.fit, store)).toEqual({ hole: "0.1" });
  });

  it("uses distinct keys", () => {
    expect(new Set(Object.values(KEYS)).size).toBe(Object.values(KEYS).length);
  });
});
