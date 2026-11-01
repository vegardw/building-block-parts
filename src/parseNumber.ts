// Parses a number typed by a user. Accepts "." or "," as the decimal separator
// ("0,05" is 0.05), surrounding spaces, a leading + or -, and the typographic
// minus sign the app itself displays. Rejects everything else (letters, "1e3",
// "0x10", "1.2.3", "1,000.5", ""), so a typo is an error and never a silently
// wrong value.
export function parseNumber(text: string): number | null {
  const t = text.trim().replace("\u2212", "-").replace(",", ".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n === 0 ? 0 : n; // no negative zero
}
