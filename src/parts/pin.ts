// Pin: part definition (pure data and checks; the CAD code is in pin.build.ts).
// A collar in the middle and a side on each end: a pin (with or without
// friction ribs), an axle, or a stud. That covers the common pins: 2L and 3L
// pins, half pins and axle pins. See docs/dimensions.md.
import { SPEC, AXLE, PIN, EPS, type ClearanceKey } from "../spec";
import type { PartDefinition } from "./types";

export type PinParams = { sideA: number; sideB: number; ends: number };

export interface PinSide {
  value: number;
  id: string; // used in file names
  label: string;
  kind: "pin" | "friction" | "axle" | "stud";
  studs: number; // length in studs from the centre of the collar (0 for a stud)
}

// Values are stored in saved settings, so they never change; the list order is
// the order in the form. 1.5 studs reaches through a beam and a half-height beam.
export const PIN_SIDES: PinSide[] = [
  { value: 0, id: "pin1", label: "Pin, 1 stud", kind: "pin", studs: 1 },
  { value: 7, id: "pin1.5", label: "Pin, 1.5 studs", kind: "pin", studs: 1.5 },
  { value: 1, id: "pin2", label: "Pin, 2 studs", kind: "pin", studs: 2 },
  { value: 2, id: "friction1", label: "Friction pin, 1 stud", kind: "friction", studs: 1 },
  { value: 8, id: "friction1.5", label: "Friction pin, 1.5 studs", kind: "friction", studs: 1.5 },
  { value: 3, id: "friction2", label: "Friction pin, 2 studs", kind: "friction", studs: 2 },
  { value: 4, id: "axle1", label: "Axle, 1 stud", kind: "axle", studs: 1 },
  { value: 5, id: "axle2", label: "Axle, 2 studs", kind: "axle", studs: 2 },
  { value: 6, id: "stud", label: "Stud (half pin)", kind: "stud", studs: 0 },
];

export const pinSide = (value: number): PinSide => {
  const side = PIN_SIDES.find((s) => s.value === value);
  if (!side) throw new Error(`Unknown pin side: ${value}`);
  return side;
};

export const isPinSide = (side: PinSide) => side.kind === "pin" || side.kind === "friction";

// 0 = snap ends like genuine pins (a lip and two slots at each tip); 1 = plain.
export const SNAP = 0;
export const PLAIN = 1;

// How much wider than the lip (or shaft) the collar must be to stop the pin.
export const MIN_COLLAR_STEP = 0.2;

const sideOptions = PIN_SIDES.map(({ value, label }) => ({ value, label }));

// Common pins as quick picks: the two sides each one sets (the pin ends keep their
// value). Described by what they are; tests/pin.test.ts checks their lengths
// against the genuine pins.
const sideValue = (id: string): number => {
  const side = PIN_SIDES.find((s) => s.id === id);
  if (!side) throw new Error(`Unknown pin side: ${id}`);
  return side.value;
};
const sides = (a: string, b: string) => ({ sideA: sideValue(a), sideB: sideValue(b) });
export const PIN_PRESETS = [
  { label: "2L pin", params: sides("pin1", "pin1") },
  { label: "2L friction pin", params: sides("friction1", "friction1") },
  { label: "3L pin", params: sides("pin1", "pin2") },
  { label: "3L friction pin", params: sides("friction1", "friction2") },
  { label: "Axle pin", params: sides("pin1", "axle1") },
  { label: "Axle pin with friction", params: sides("friction1", "axle1") },
  { label: "Half pin", params: sides("pin1", "stud") },
];

// Overall length in mm, tip to tip.
export function pinLength({ sideA, sideB }: PinParams): number {
  const length = (side: PinSide) =>
    side.kind === "stud"
      ? PIN.studHeight
      : side.kind === "axle"
        ? side.studs * SPEC.pitch - AXLE.endInset
        : side.studs * SPEC.pitch;
  return length(pinSide(sideA)) + length(pinSide(sideB));
}

// Every setting a pin can use; a given pin uses the axle size only with an axle side
// and the stud diameter only with a stud.
const PIN_SETTINGS: readonly ClearanceKey[] = ["pin", "collar", "axle", "stud"];

const pin: PartDefinition<PinParams> = {
  id: "pin",
  name: "Pin",
  clearance: PIN_SETTINGS,

  uses({ sideA, sideB }) {
    const sides = [sideA, sideB].map((v) => PIN_SIDES.find((s) => s.value === v));
    if (sides.some((s) => s === undefined)) return PIN_SETTINGS; // invalid: the form says why
    return PIN_SETTINGS.filter(
      (key) =>
        (key !== "axle" || sides.some((s) => s?.kind === "axle")) &&
        (key !== "stud" || sides.some((s) => s?.kind === "stud")),
    );
  },
  presets: { label: "Common pins", options: PIN_PRESETS },
  params: [
    {
      key: "sideA",
      label: "Side 1",
      type: "choice",
      options: sideOptions,
      default: 0,
      hint: "A pin side goes through a beam's hole: 1 stud through one beam, 1.5 through a beam and a half-height beam, 2 through two beams. Friction pins have small ribs that stop them turning freely.",
    },
    { key: "sideB", label: "Side 2", type: "choice", options: sideOptions, default: 0 },
    {
      key: "ends",
      label: "Pin ends",
      type: "choice",
      options: [
        { value: SNAP, label: "Snap: lip and slots, like genuine pins" },
        { value: PLAIN, label: "Plain: no lip or slots" },
      ],
      default: SNAP,
      hint: "The lip clicks into the far counterbore; the slots let the tip flex. Plain ends are easier to machine and suit brittle resins, but don't click in.",
    },
  ],

  validate({ sideA, sideB, ends }, { pin: size, collar }) {
    if (!isPinSide(pinSide(sideA)) && !isPinSide(pinSide(sideB))) {
      return "At least one side must be a pin; an axle on both sides is an axle.";
    }
    const tip = (ends === SNAP ? PIN.lipD : PIN.shaftD) + size;
    const collarD = SPEC.collarD + collar;
    if (collarD < tip + MIN_COLLAR_STEP - EPS) {
      return `The collar (${collarD.toFixed(2)} mm) would be less than ${MIN_COLLAR_STEP} mm wider than the pin (${tip.toFixed(2)} mm). Increase the collar diameter or reduce the pin diameter.`;
    }
    return null;
  },

  info(params) {
    return `${pinLength(params).toFixed(1)} mm long.`;
  },

  // Tiles shown with the fit settings: the sizes they result in.
  summary({ sideA, sideB, ends }, { pin: size, collar, axle, stud }) {
    const sides = [pinSide(sideA), pinSide(sideB)];
    const tiles = [
      { label: "Shaft ⌀", value: `${(PIN.shaftD + size).toFixed(2)} mm` },
      ...(ends === SNAP ? [{ label: "Lip ⌀", value: `${(PIN.lipD + size).toFixed(2)} mm` }] : []),
      { label: "Collar ⌀", value: `${(SPEC.collarD + collar).toFixed(2)} mm` },
    ];
    if (sides.some((s) => s.kind === "axle"))
      tiles.push({ label: "Cross ⌀", value: `${(AXLE.crossD + axle).toFixed(2)} mm` });
    if (sides.some((s) => s.kind === "stud"))
      tiles.push({ label: "Stud ⌀", value: `${(PIN.shaftD + stud).toFixed(2)} mm` });
    return tiles;
  },

  // A common pin by its name, others by their sides.
  describe({ sideA, sideB, ends }) {
    const preset = PIN_PRESETS.find((p) => p.params.sideA === sideA && p.params.sideB === sideB);
    const sides = preset ? preset.label : `${pinSide(sideA).label} + ${pinSide(sideB).label.toLowerCase()}`;
    return ends === PLAIN ? `${sides}, plain ends` : sides;
  },

  filename: ({ sideA, sideB, ends }) =>
    `pin-${pinSide(sideA).id}-${pinSide(sideB).id}${ends === PLAIN ? "-plain" : ""}`,
};

export default pin;
