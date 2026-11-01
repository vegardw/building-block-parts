// The fit settings (pure, no CAD import): the six clearance values as typed, and
// where each came from. They belong to the machine, not to a part: every part
// reads the ones it uses, the Calibrate section writes them, and they can be
// saved to a file and loaded in another browser.
import { CLEARANCE_FIELDS, type ClearanceKey } from "./spec";
import { clearanceTextFrom, readClearance, type ClearanceText } from "./clearance";
import { parseNumber } from "./parseNumber";

export interface Origin {
  by: "calibration" | "hand";
  date: string; // YYYY-MM-DD
}
export type Origins = Partial<Record<ClearanceKey, Origin>>;

export interface Fit {
  text: ClearanceText;
  origins: Origins;
}

// A date as YYYY-MM-DD in local time (toISOString would give the UTC date).
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isOrigin = (v: unknown): v is Origin =>
  !!v && typeof v === "object" && ["calibration", "hand"].includes((v as Origin).by) && isDate((v as Origin).date);

// Saved origins -> origins; anything malformed is dropped (the value then shows
// as set by hand or not calibrated, which is safe).
export function originsFrom(saved: unknown): Origins {
  const origins: Origins = {};
  if (saved && typeof saved === "object") {
    for (const f of CLEARANCE_FIELDS) {
      const o = (saved as Record<string, unknown>)[f.key];
      if (isOrigin(o)) origins[f.key] = { by: o.by, date: o.date };
    }
  }
  return origins;
}

export const NOMINAL_FIT: Fit = { text: clearanceTextFrom(null), origins: {} };

// A value typed in the fit settings.
export const typeFitValue = (fit: Fit, key: ClearanceKey, text: string, date: string): Fit => ({
  text: { ...fit.text, [key]: text },
  origins: { ...fit.origins, [key]: { by: "hand", date } },
});

// A value found with a calibration part or a measured beam. Written as plain
// text (at most 4 decimals), like a typed value.
export const calibratedFitValue = (fit: Fit, key: ClearanceKey, value: number, date: string): Fit => ({
  text: { ...fit.text, [key]: String(Number(value.toFixed(4))) },
  origins: { ...fit.origins, [key]: { by: "calibration", date } },
});

// What the fit settings and the Calibrate steps show for a value.
export type FieldStatus =
  | { kind: "calibrated"; date: string }
  | { kind: "hand"; date?: string } // set by hand, or saved before origins were kept
  | { kind: "none" }; // never set: nominal

export function fieldStatus(fit: Fit, key: ClearanceKey): FieldStatus {
  const origin = fit.origins[key];
  if (origin?.by === "calibration") return { kind: "calibrated", date: origin.date };
  if (origin) return { kind: "hand", date: origin.date };
  return parseNumber(fit.text[key]) === 0 ? { kind: "none" } : { kind: "hand" };
}

// The fit settings file: values as numbers in mm, so it is readable and can be
// written by hand. Unknown keys are ignored on loading, so later versions can add to it.
export const FIT_FILE_FORMAT = "building-block-parts-fit-settings";

interface FileField {
  value: number;
  origin?: Origin["by"];
  date?: string;
}

// The file's text, or a message if a value can't be saved.
export function fitToFile(fit: Fit, date: string): { text: string } | { error: string } {
  const { clearance, problem } = readClearance(fit.text);
  if (!clearance) return { error: `${problem} Correct it before saving.` };
  const settings = Object.fromEntries(
    CLEARANCE_FIELDS.map((f): [string, FileField] => {
      const origin = fit.origins[f.key];
      return [
        f.key,
        origin ? { value: clearance[f.key], origin: origin.by, date: origin.date } : { value: clearance[f.key] },
      ];
    }),
  );
  const file = { format: FIT_FILE_FORMAT, version: 1, saved: date, unit: "mm", settings };
  return { text: JSON.stringify(file, null, 2) + "\n" };
}

// A loaded file replaces all six values: one missing from the file (e.g. saved
// before that setting existed) becomes 0. Nothing is changed if any value is wrong.
export function fitFromFile(text: string): { fit: Fit } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "This file isn't a fit settings file: it can't be read as JSON." };
  }
  const file = data as { format?: unknown; settings?: unknown } | null;
  if (
    !file ||
    typeof file !== "object" ||
    file.format !== FIT_FILE_FORMAT ||
    !file.settings ||
    typeof file.settings !== "object"
  ) {
    return { error: "This file isn't a fit settings file from this app." };
  }
  const fit: Fit = { text: clearanceTextFrom(null), origins: {} };
  for (const f of CLEARANCE_FIELDS) {
    const field = (file.settings as Record<string, unknown>)[f.key];
    if (field === undefined) continue;
    const raw = (field as FileField | null)?.value;
    // Rounded to a millionth of a mm, far below any machine's resolution: a value
    // written by hand as 1e-7 would otherwise become the text "1e-7", which the
    // fields reject, and one a hair beyond the limit would load but show as invalid.
    const value = typeof raw === "number" ? Number(raw.toFixed(6)) + 0 : NaN; // + 0 turns -0 into 0
    if (!Number.isFinite(value) || Math.abs(value) > f.limit) {
      return {
        error: `${f.name} in this file must be a number from −${f.limit} to ${f.limit} mm. Nothing was changed.`,
      };
    }
    fit.text[f.key] = String(value);
    const origin = { by: (field as FileField).origin, date: (field as FileField).date };
    if (isOrigin(origin)) fit.origins[f.key] = origin;
  }
  return { fit };
}
