// Nominal dimensions (mm) shared by all parts, and the global
// manufacturing-clearance settings. No CAD import, so the UI can use it.
//
// Nominal = design values on the 8 mm grid, written as fractions of the module
// L = pitch; they match both the proportional drawing and the LDraw library
// geometry. Sources and the choices made where they disagree: docs/dimensions.md.

export const SPEC = {
  // L. Measurements range from 7.97 to 8.00; every design source uses 8.
  // Never changed by clearance.
  pitch: 8,
  width: 7.2, // 0.9 L
  height: 8, // L, thickness along the holes
  halfHeight: 4, // 0.5 L, half-height beam (thin liftarm); same holes and counterbores
  holeD: 4.8, // 0.6 L
  // Measured on genuine beams (about 6.20) and drawn so by Bartneck; the
  // proportional drawing and LDraw give 6.4 (0.8 L). See docs/dimensions.md.
  cboreD: 6.2,
  cboreDepth: 0.8, // 0.1 L
  // Collars and stop flanges that seat in a counterbore (axle stops; pins later).
  // Measured on genuine parts, 5.92-6.02 mm; smaller than the counterbore on
  // purpose, so they seat with play (0.1 mm per side in a 6.2 counterbore). The
  // drawing and LDraw give 6.4 (0.8 L).
  collarD: 6.0,
};

// Axles (mm). The cross is two arms of armWidth whose tips lie on a circle of
// crossD. Values from the proportional drawing and LDraw's axle parts; sources in
// docs/dimensions.md.
export const AXLE = {
  crossD: 4.8, // 0.6 L, tip to tip
  armWidth: 1.6, // 0.2 L; not yet checked against a real axle with calipers
  endInset: 0.2, // a bevelled end face sits this far inside the nominal length
  bevelLength: 0.8, // along the axle
  bevelTipD: 2.57, // tip-to-tip at the bevelled end face
  // Stop flanges are SPEC.collarD across, except on a stop one stud in, which
  // measured smaller (one axle, so unconfirmed).
  stopInD: 5.75,
  stopThickness: 0.8, // 0.1 L
  sleeveLength: 3.2, // round section next to a stop one stud in
  studD: 4.8, // open stud on the end (axle with stud)
  studHeight: 1.6,
  studBoreD: 3.2,
  notchFrom: 3.6, // notches, measured from the nominal end
  notchTo: 4.8,
  notchFloorD: 3.2,
};

// Pins (mm), per pin half measured from the centre of the collar. From LDraw's
// pin primitives (connect.dat, fric.dat) and the drawing; the collar diameter is
// SPEC.collarD (measured). Sources in docs/dimensions.md.
export const PIN = {
  shaftD: 4.8, // 0.6 L
  boreD: 3.2, // 0.4 L
  lipD: 5.2, // snap lip at the tip: springs into the far counterbore
  lipLength: 0.8, // 0.1 L, the counterbore depth
  collarWidth: 0.8, // 0.1 L per pin half: each half's collar sits in one counterbore
  slotWidth: 0.8, // two slots per tip, through the wall, so the lip can pass the hole
  slotLength: 3.4, // from the tip
  ribHeight: 0.1, // friction ribs above the shaft, four per row at 45°
  ribWidth: 0.6,
  ribLength: 2.0, // two rows: next to the collar and next to the lip
  studHeight: 1.6, // open stud on a half pin, as on the axle with stud
};

// Minimum wall beside the counterbore, mm. Our own manufacturing limit (nominal
// wall is 0.5), not a dimension of the system; not yet tested on a real print.
export const MIN_WALL = 0.2;

// The longest part, in studs: the longest genuine axle (32 studs, 256 mm). Beams
// share it, so an n-hole beam always fits an n-stud axle; a 32-hole beam is
// 255.2 mm long, which still fits a 256 mm print bed.
export const MAX_STUDS = 32;

// Changes to the nominal dimension (diameter / overall size) in mm, set once
// per machine and shared by all parts. Positive = bigger. Each part lists the
// fields it uses in `clearance` (see parts/types.ts); the others are 0 for it.
export interface Clearance {
  hole: number;
  width: number;
  height: number;
  axle: number;
  pin: number;
  collar: number;
}
export type ClearanceKey = keyof Clearance;

export const NO_CLEARANCE: Clearance = { hole: 0, width: 0, height: 0, axle: 0, pin: 0, collar: 0 };

// Slack for limit checks, so a value exactly at a limit isn't rejected because
// of float rounding ((7.2 - 0.2 - (6.2 + 0.4)) / 2 is a hair below 0.2).
export const EPS = 1e-9;

// Each clearance value must lie within ±CLEARANCE_LIMIT mm, the axle size
// within ±AXLE_SIZE_LIMIT: beyond it the bevel and the notches no longer fit.
export const CLEARANCE_LIMIT = 1;
export const AXLE_SIZE_LIMIT = 0.5;
export const PIN_SIZE_LIMIT = 0.5;
export const COLLAR_SIZE_LIMIT = 0.5;

export interface ClearanceField {
  key: ClearanceKey;
  name: string; // used in messages and the "adjusted" indicator
  label: string;
  hint: string;
  limit: number; // allowed range ±limit mm
}

export const CLEARANCE_FIELDS: ClearanceField[] = [
  {
    key: "hole",
    name: "Hole diameter",
    label: "Hole diameter (mm)",
    hint: `Added to the ${SPEC.holeD} mm hole and the ${SPEC.cboreD} mm counterbore. Increase if axles or pins are too tight; the hole calibration bar finds it.`,
    limit: CLEARANCE_LIMIT,
  },
  {
    key: "width",
    name: "Beam width",
    label: "Beam width (mm)",
    hint: `Added to the ${SPEC.width} mm width. Often zero or slightly negative for processes that grow outer surfaces; measuring the test beam under Calibrate finds it.`,
    limit: CLEARANCE_LIMIT,
  },
  {
    key: "height",
    name: "Beam height",
    label: "Beam height (mm)",
    hint: `Added to the beam height (${SPEC.height} mm, or ${SPEC.halfHeight} mm for a half-height beam). Kept separate because XY and Z errors often differ; measuring the test beam under Calibrate finds it.`,
    limit: CLEARANCE_LIMIT,
  },
  {
    key: "axle",
    name: "Axle size",
    label: "Axle size (mm)",
    hint: `Added to the axle's cross (${AXLE.crossD} mm tip to tip, ${AXLE.armWidth} mm arms) and its stud. Usually zero or slightly negative; the calibration axle finds it.`,
    limit: AXLE_SIZE_LIMIT,
  },
  {
    key: "pin",
    name: "Pin diameter",
    label: "Pin diameter (mm)",
    hint: `Added to the pin's shaft (${PIN.shaftD} mm), its lips and friction ribs, and a half pin's stud. A pin without friction should turn freely in a hole; the pin calibration bar finds it.`,
    limit: PIN_SIZE_LIMIT,
  },
  {
    key: "collar",
    name: "Collar diameter",
    label: "Collar diameter (mm)",
    hint: `Added to every pin collar and axle stop that sits in a counterbore (${SPEC.collarD} mm; ${AXLE.stopInD} mm on a stop one stud in). It should seat in a counterbore with a little play; the collar calibration bar finds it.`,
    limit: COLLAR_SIZE_LIMIT,
  },
];

export function clearanceField(key: ClearanceKey): ClearanceField {
  const field = CLEARANCE_FIELDS.find((f) => f.key === key);
  if (!field) throw new Error(`Unknown fit setting: ${key}`);
  return field;
}
