// Saved settings -> the app's starting state (pure, no CAD import). Anything
// missing, unknown or invalid falls back to the defaults, so old or corrupt
// data can't break the app.
import { PARTS, REGULAR_PARTS, DEFAULT_PART, getPart, defaultText, parseParams, validatePart } from "./parts/index";
import type { FileFormat, ParamText, PartDefinition } from "./parts/types";
import { CALIBRATION_STEPS, getStep, type StepId } from "./calibrationSteps";
import { NO_CLEARANCE } from "./spec";
import { HALF } from "./parts/beam";

// Parts that became an option of another part: the part that took each one in,
// and the parameters that select it there.
const MERGED: Record<string, { partId: string; params: ParamText }> = {
  "half-beam": { partId: "beam", params: { height: String(HALF) } },
};

export interface Settings {
  partId: string; // the part shown under Parts
  stepId: StepId; // the step shown under Calibrate
  paramText: Record<string, ParamText>; // every part's parameters, calibration parts included
  format: FileFormat; // the file type downloads get
}

interface Saved {
  partId?: unknown;
  stepId?: unknown;
  format?: unknown;
  paramText?: Record<string, Record<string, unknown>>;
}

export function settingsFrom(saved: unknown): Settings {
  const s = saved && typeof saved === "object" ? (saved as Saved) : null;
  // A merged part that was selected opens as the part that took it in, with its parameters.
  const merged = typeof s?.partId === "string" ? MERGED[s.partId] : undefined;
  const savedText = (part: PartDefinition): Record<string, unknown> | undefined =>
    merged?.partId === part.id ? { ...s?.paramText?.[s.partId as string], ...merged.params } : s?.paramText?.[part.id];
  const paramText = Object.fromEntries(
    PARTS.map((part) => {
      let text = defaultText(part);
      for (const key of Object.keys(text)) {
        const value = savedText(part)?.[key];
        if (typeof value === "string") text[key] = value;
      }
      if (validatePart(part, parseParams(part, text), NO_CLEARANCE) !== null) {
        text = defaultText(part);
      }
      return [part.id, text];
    }),
  );
  // Settings saved while a calibration part was in the part list open its step instead.
  const savedPart = typeof s?.partId === "string" ? getPart(merged?.partId ?? s.partId) : undefined;
  const partId = REGULAR_PARTS.find((p) => p === savedPart)?.id ?? DEFAULT_PART.id;
  const stepId =
    (typeof s?.stepId === "string" ? getStep(s.stepId)?.id : undefined) ??
    CALIBRATION_STEPS.find((step) => savedPart?.calibration && step.partId === savedPart.id)?.id ??
    CALIBRATION_STEPS[0].id;
  const format: FileFormat = s?.format === "stl" ? "stl" : "step";
  return { partId, stepId, paramText, format };
}

// Parameters named in an address (#parts/beam?holes=7) over a part's current
// ones; null if the address names none of the part's parameters or the result
// isn't a valid part, so a broken link can't leave the form in a bad state.
export function paramsFromAddress(
  part: PartDefinition,
  query: Record<string, string> | null,
  current: ParamText,
): ParamText | null {
  const named = part.params.flatMap((p) => {
    const value = query?.[p.key];
    return typeof value === "string" ? [[p.key, value] as const] : [];
  });
  if (named.length === 0) return null;
  const text = { ...current, ...Object.fromEntries(named) };
  return validatePart(part, parseParams(part, text), NO_CLEARANCE) === null ? text : null;
}
