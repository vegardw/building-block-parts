// The Parts section's part choice: a tile with an icon per part, so every part is
// in view. Radio buttons underneath: one tab stop, arrow keys move between parts.
import type { ReactNode } from "react";
import type { PartDefinition } from "./parts/types";

// Simple line drawings, seen from the side (beam from above), in the text colour.
const ICONS: Record<string, ReactNode> = {
  beam: (
    <>
      <rect x="2" y="9" width="44" height="14" rx="7" />
      <circle cx="9" cy="16" r="3.5" />
      <circle cx="24" cy="16" r="3.5" />
      <circle cx="39" cy="16" r="3.5" />
    </>
  ),
  axle: (
    <>
      <path d="M4 12.5h40v7H4z" />
      <path d="M4 16h40" />
      <path d="M8 12.5v7M40 12.5v7" />
    </>
  ),
  pin: (
    <>
      <rect x="4" y="11.5" width="40" height="9" rx="2" />
      <rect x="21.5" y="8" width="5" height="16" rx="1" />
      <path d="M4 16h5M39 16h5" />
    </>
  ),
  brick: (
    <>
      <rect x="6" y="11" width="36" height="16" rx="1" />
      <path d="M10 11V7.5h6V11M21 11V7.5h6V11M32 11V7.5h6V11" />
    </>
  ),
  "brick-with-holes": (
    <>
      <rect x="6" y="11" width="36" height="16" rx="1" />
      <path d="M10 11V7.5h6V11M21 11V7.5h6V11M32 11V7.5h6V11" />
      <circle cx="18.5" cy="19.5" r="3.5" />
      <circle cx="29.5" cy="19.5" r="3.5" />
    </>
  ),
  plate: (
    <>
      <rect x="6" y="17" width="36" height="6" rx="1" />
      <path d="M10 17v-3.5h6V17M21 17v-3.5h6V17M32 17v-3.5h6V17" />
    </>
  ),
};

const FALLBACK = <rect x="10" y="8" width="28" height="16" rx="2" />;

export function PartIcon({ id }: { id: string }) {
  return (
    <svg className="part-icon" viewBox="0 0 48 32" width="48" height="32" aria-hidden="true">
      {ICONS[id] ?? FALLBACK}
    </svg>
  );
}

export default function PartPicker({
  parts,
  value,
  onChange,
}: {
  parts: PartDefinition[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="part-picker">
      <legend>Part</legend>
      <div className="tiles">
        {parts.map((p) => (
          <label key={p.id} className="tile">
            <input type="radio" name="part" value={p.id} checked={p.id === value} onChange={() => onChange(p.id)} />
            <PartIcon id={p.id} />
            <span className="tile-name">{p.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
