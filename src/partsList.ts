// The parts list (pure, no CAD import): parts with their parameters and a
// quantity, collected on the Parts section and downloaded as one file. The
// parameters are stored as numbers and checked when loaded, so a part that no
// longer exists or isn't valid any more is dropped instead of breaking the app.
import { REGULAR_PARTS, getPart, requirePart, validatePart } from "./parts/index";
import type { ParamValues, PartDefinition } from "./parts/types";
import { NO_CLEARANCE } from "./spec";

export interface ListItem {
  partId: string;
  params: ParamValues;
  count: number;
}

export const MAX_COUNT = 99;

const clampCount = (n: number) => Math.min(MAX_COUNT, Math.max(1, Math.round(n)));

// Only the part's own parameters, in its order, so equal parts compare equal.
const ownParams = (part: PartDefinition, params: ParamValues): ParamValues =>
  Object.fromEntries(part.params.map((p) => [p.key, params[p.key] ?? NaN])); // NaN: missing, so invalid

const same = (a: ListItem, partId: string, params: ParamValues) =>
  a.partId === partId && Object.entries(a.params).every(([k, v]) => params[k] === v);

// Adds `count` of a part; one already in the list gets more instead of a second line.
export function addToList(list: ListItem[], partId: string, params: ParamValues, count = 1): ListItem[] {
  const part = getPart(partId);
  if (!part) return list;
  const own = ownParams(part, params);
  const index = list.findIndex((item) => same(item, partId, own));
  const existing = list[index];
  if (existing) return setCount(list, index, existing.count + count);
  return [...list, { partId, params: own, count: clampCount(count) }];
}

export const setCount = (list: ListItem[], index: number, count: number): ListItem[] =>
  list.map((item, i) => (i === index ? { ...item, count: clampCount(count) } : item));

export const removeFromList = (list: ListItem[], index: number): ListItem[] => list.filter((_, i) => i !== index);

export const totalCount = (list: ListItem[]): number => list.reduce((sum, item) => sum + item.count, 0);

// "Beam (liftarm)" and "7 holes, full height": what the list shows and the names in the file.
export function describeItem(item: ListItem): { name: string; detail: string } {
  const part = requirePart(item.partId);
  return { name: part.name, detail: part.describe?.(item.params) ?? part.filename(item.params) };
}

// Saved list -> list; anything unknown, malformed or invalid is dropped.
export function listFrom(saved: unknown): ListItem[] {
  if (!Array.isArray(saved)) return [];
  const list: ListItem[] = [];
  for (const entry of saved) {
    const { partId, params, count } = (entry ?? {}) as Partial<ListItem>;
    const part = REGULAR_PARTS.find((p) => p.id === partId);
    if (!part || !params || typeof params !== "object" || typeof count !== "number" || !Number.isFinite(count))
      continue;
    const own = ownParams(part, params);
    if (validatePart(part, own, NO_CLEARANCE) !== null) continue;
    list.push({ partId: part.id, params: own, count: clampCount(count) });
  }
  return list;
}
