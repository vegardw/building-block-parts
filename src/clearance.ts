// Reads the clearance form text (pure, no CAD import). Kept out of App.tsx so
// the UI can tell which field is wrong and whether the clearance is nominal,
// and so that logic is testable.
import { CLEARANCE_FIELDS, NO_CLEARANCE, type Clearance, type ClearanceKey } from "./spec";
import { parseNumber } from "./parseNumber";

export type ClearanceText = Record<ClearanceKey, string>;

// Saved clearance text -> form text. Fields missing or not text (e.g. axle in
// data saved before that field existed) start at "0"; the others are kept.
export function clearanceTextFrom(saved: unknown): ClearanceText {
  const text = Object.fromEntries(CLEARANCE_FIELDS.map((f) => [f.key, "0"])) as ClearanceText;
  if (saved && typeof saved === "object") {
    for (const f of CLEARANCE_FIELDS) {
      const value = (saved as Record<string, unknown>)[f.key];
      if (typeof value === "string") text[f.key] = value;
    }
  }
  return text;
}

// Signed, two decimals, typographic minus: "+0.20", "−0.10", "0.00".
export const formatClearance = (c: number): string => `${c > 0 ? "+" : c < 0 ? "−" : ""}${Math.abs(c).toFixed(2)}`;

export interface ClearanceState {
  clearance: Clearance | null; // null while a used field is invalid; unused fields are 0
  invalid: ClearanceKey[]; // used fields that aren't a number within their limit
  problem: string | null; // message naming the invalid fields
  adjustments: string[]; // non-zero used values, e.g. "Hole diameter +0.20 mm"; empty = nominal
}

// Reads the fields a part uses (`keys`, all by default). Unused fields count as 0
// and are never invalid, so a bad value in a field the part ignores can't block
// it, and editing that field doesn't change the part's build request.
export function readClearance(
  text: ClearanceText,
  keys: readonly ClearanceKey[] = CLEARANCE_FIELDS.map((f) => f.key),
): ClearanceState {
  const fields = CLEARANCE_FIELDS.filter((f) => keys.includes(f.key));
  const clearance: Clearance = { ...NO_CLEARANCE };
  const bad = fields.filter((f) => {
    const v = parseNumber(text[f.key]);
    if (v === null || Math.abs(v) > f.limit) return true;
    clearance[f.key] = v;
    return false;
  });
  if (bad.length > 0) {
    // One sentence per limit, naming its fields: "Clearance for a, b and c must be ...".
    const limits = [...new Set(bad.map((f) => f.limit))];
    const problem = limits
      .map((limit) => {
        const names = bad.filter((f) => f.limit === limit).map((f) => f.name.toLowerCase());
        const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
        return `Clearance for ${list} must be a number from −${limit} to ${limit} mm.`;
      })
      .join(" ");
    return { clearance: null, invalid: bad.map((f) => f.key), problem, adjustments: [] };
  }
  const adjustments = fields
    .filter((f) => clearance[f.key] !== 0)
    .map((f) => `${f.name} ${formatClearance(clearance[f.key])} mm`);
  return { clearance, invalid: [], problem: null, adjustments };
}

// How many of all the fields aren't zero and how many aren't valid, for the
// header's button. Each field is read on its own: readClearance reports no
// adjustments while any field is invalid, which would make the button say
// "nominal" over values that are in use.
export function clearanceCounts(text: ClearanceText): { adjusted: number; invalid: number } {
  const states = CLEARANCE_FIELDS.map((f) => readClearance(text, [f.key]));
  return {
    adjusted: states.filter((s) => s.adjustments.length > 0).length,
    invalid: states.filter((s) => s.clearance === null).length,
  };
}
