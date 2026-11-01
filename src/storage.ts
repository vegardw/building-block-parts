// What the app keeps in the browser (localStorage), one key per kind of data.
// Reading never throws: unavailable storage or corrupt data reads as null, and
// the readers (settingsFrom, listFrom, ...) then fall back to their defaults.

export const KEYS = {
  fit: "building-block-parts-fit", // fit settings as typed
  origins: "building-block-parts-fit-origins", // where each fit setting came from
  settings: "building-block-parts-settings", // selected part and step, every part's parameters, file type
  list: "building-block-parts-list", // the parts list
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

// Keys that were renamed: the old one is read while the new one is missing, and
// removed when the new one is first written, so saved data moves over by itself.
const OLD_KEYS: Partial<Record<StorageKey, string>> = {
  [KEYS.fit]: "beam-generator-clearance", // the first version's name
};

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// A function, because even reaching `localStorage` throws when the browser blocks site data.
const browserStore = (): Store => localStorage;

export function readStorage(key: StorageKey, store: () => Store = browserStore): unknown {
  try {
    const s = store();
    const old = OLD_KEYS[key];
    return JSON.parse(s.getItem(key) ?? (old ? s.getItem(old) : null) ?? "null");
  } catch {
    return null;
  }
}

export function writeStorage(key: StorageKey, value: unknown, store: () => Store = browserStore): void {
  try {
    const s = store();
    s.setItem(key, JSON.stringify(value));
    const old = OLD_KEYS[key];
    if (old) s.removeItem(old);
  } catch {
    // ignore: persistence is a convenience only
  }
}
