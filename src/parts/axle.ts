// Axle: part definition (pure data and checks; the CAD code is in axle.build.ts).
// Length in studs, half steps allowed (official axles include 3.5, 4.5 and 5.5).
// Each end can be plain, notched or carry a stop; see docs/dimensions.md.
import { SPEC, AXLE, MAX_STUDS, EPS, type ClearanceKey } from "../spec";
import type { PartDefinition } from "./types";

export type AxleParams = { length: number; endA: number; endB: number };

export interface AxleEnd {
  value: number;
  id: "plain" | "notched" | "stop" | "stud" | "stop-in";
  label: string;
  reserved: number; // length the end feature needs, from the nominal end inwards (mm)
}

export const AXLE_ENDS: AxleEnd[] = [
  { value: 0, id: "plain", label: "Plain (bevelled)", reserved: AXLE.endInset + AXLE.bevelLength },
  { value: 1, id: "notched", label: "Notched", reserved: AXLE.notchTo },
  { value: 2, id: "stop", label: "Stop", reserved: AXLE.stopThickness },
  { value: 3, id: "stud", label: "Stop with stud", reserved: AXLE.stopThickness },
  {
    value: 4,
    id: "stop-in",
    label: "Stop one stud in",
    reserved: SPEC.pitch + AXLE.sleeveLength,
  },
];

export const axleEnd = (value: number): AxleEnd => {
  const end = AXLE_ENDS.find((e) => e.value === value);
  if (!end) throw new Error(`Unknown axle end: ${value}`);
  return end;
};

// Flange diameter of an end with a stop, or null.
export function stopDiameter(end: AxleEnd, collar: number): number | null {
  if (end.id === "stop" || end.id === "stud") return SPEC.collarD + collar;
  if (end.id === "stop-in") return AXLE.stopInD + collar;
  return null;
}

// How much wider than the cross a stop must be to act as one (0.1 mm per side).
export const MIN_STOP_STEP = 0.2;

const endOptions = AXLE_ENDS.map(({ value, label }) => ({ value, label }));
const endHint =
  `Stop: a ${SPEC.collarD} mm flange that sits in a counterbore. Stop one stud in: the flange 8 mm from the end, ` +
  "with a round section that won't enter an axle hole. Notched: grooves for extra grip.";

// Every setting an axle can use; a given axle uses the collar diameter only with a
// stop and the stud diameter only with a stud.
const AXLE_SETTINGS: readonly ClearanceKey[] = ["axle", "collar", "stud"]; // outside sizes, so not the hole clearance

const axle: PartDefinition<AxleParams> = {
  id: "axle",
  name: "Axle",
  clearance: AXLE_SETTINGS,

  uses({ endA, endB }) {
    const ends = [endA, endB].map((v) => AXLE_ENDS.find((e) => e.value === v));
    if (ends.some((e) => e === undefined)) return AXLE_SETTINGS; // invalid: the form says why
    return AXLE_SETTINGS.filter(
      (key) =>
        (key !== "collar" || ends.some((e) => e !== undefined && stopDiameter(e, 0) !== null)) &&
        (key !== "stud" || ends.some((e) => e?.id === "stud")),
    );
  },
  params: [
    {
      key: "length",
      label: "Length (studs)",
      type: "number",
      min: 1,
      max: MAX_STUDS,
      step: 0.5,
      default: 4,
      hint: "Whole or half studs, e.g. 5.5. One stud is 8 mm.",
    },
    { key: "endA", label: "End 1", type: "choice", options: endOptions, default: 0, hint: endHint },
    { key: "endB", label: "End 2", type: "choice", options: endOptions, default: 0 },
  ],

  // Half studs are the length's step, checked with its range (paramProblem).
  validate({ length, endA, endB }, { axle: size, collar }) {
    const needed = axleEnd(endA).reserved + axleEnd(endB).reserved;
    const available = length * SPEC.pitch;
    if (needed > available + EPS) {
      return `A ${length}-stud axle (${available} mm) is too short for these ends: they need ${needed.toFixed(1)} mm. Choose a longer axle or other ends.`;
    }
    // A stop must stand out from the cross (and the round section beside it).
    const cross = AXLE.crossD + size;
    for (const e of [endA, endB].map(axleEnd)) {
      const stop = stopDiameter(e, collar);
      if (stop !== null && stop < cross + MIN_STOP_STEP - EPS) {
        return `The stop (${stop.toFixed(2)} mm) would be less than ${MIN_STOP_STEP} mm wider than the cross (${cross.toFixed(2)} mm). Increase the collar diameter or reduce the axle size.`;
      }
    }
    return null;
  },

  info({ length, endA, endB }) {
    const stud = [endA, endB].filter((e) => axleEnd(e).id === "stud").length;
    const total = length * SPEC.pitch + stud * AXLE.studHeight;
    return `${total.toFixed(1)} mm long${stud ? " including the stud" : ""}.`;
  },

  // Tiles shown with the fit settings: the sizes they result in.
  summary({ endA, endB }, { axle: size, collar, stud }) {
    // One tile per kind of stop present (tiles are keyed by label).
    const stops = new Map<string, number>();
    for (const end of [endA, endB].map(axleEnd)) {
      const d = stopDiameter(end, collar);
      if (d !== null) stops.set(end.id === "stop-in" ? "Inner stop ⌀" : "Stop ⌀", d);
    }
    const studs = [endA, endB].some((e) => axleEnd(e).id === "stud");
    return [
      { label: "Cross ⌀", value: `${(AXLE.crossD + size).toFixed(2)} mm` },
      { label: "Arm width", value: `${(AXLE.armWidth + size).toFixed(2)} mm` },
      ...[...stops].map(([label, d]) => ({ label, value: `${d.toFixed(2)} mm` })),
      ...(studs ? [{ label: "Stud ⌀", value: `${(AXLE.studD + stud).toFixed(2)} mm` }] : []),
    ];
  },

  describe: ({ length, endA, endB }) =>
    `${length} ${length === 1 ? "stud" : "studs"}, ${axleEnd(endA).label.toLowerCase()} / ${axleEnd(endB).label.toLowerCase()}`,

  filename: ({ length, endA, endB }) => `axle-${length}-${axleEnd(endA).id}-${axleEnd(endB).id}`,
};

export default axle;
