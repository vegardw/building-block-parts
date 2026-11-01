// The −/+ buttons and arrow keys of a number field (pure): the next value on the
// field's step grid (min, min + step, ...), within its range. A value between
// two steps goes to the neighbouring one in that direction; text that isn't a
// number starts from `fallback` (the parameter's default).
import { parseNumber } from "./parseNumber";

export interface StepRange {
  step: number;
  min: number;
  max: number;
  fallback: number;
}

export function stepText(text: string, direction: 1 | -1, { step, min, max, fallback }: StepRange): string {
  const value = parseNumber(text);
  let next = fallback;
  if (value !== null) {
    const k = (value - min) / step; // position on the grid; 1e-9 absorbs float noise
    next = min + step * (direction > 0 ? Math.floor(k + 1e-9) + 1 : Math.ceil(k - 1e-9) - 1);
  }
  const decimals = (String(step).split(".")[1] ?? "").length;
  return String(Number(Math.min(max, Math.max(min, next)).toFixed(decimals)));
}
