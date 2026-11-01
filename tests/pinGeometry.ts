// Builds pins and measures them from their STEP geometry (no CAD knowledge in
// the measuring): used by pin.test.ts and the side-combination sweep (pinSides.ts).
import { requirePart } from "../src/parts/index";
import { buildPart } from "../src/parts/builders";
import { PIN_SIDES, SNAP, type PinParams } from "../src/parts/pin";
import { NO_CLEARANCE, type Clearance } from "../src/spec";
import { analyseStep, stepGeometry, type StepGeometry } from "./stepStats";

// A pin side's value by its id ("pin1", "friction2", ...).
export const side = (id: string) => PIN_SIDES.find((s) => s.id === id)!.value;

export const part = requirePart("pin");
// A 2L pin with snap ends, changed by `p`.
export const params = (p: Partial<PinParams>): PinParams => ({
  sideA: side("pin1"),
  sideB: side("pin1"),
  ends: SNAP,
  ...p,
});
export const r3 = (n: number) => Number(n.toFixed(3));
export const isAxis = (v: number[], i: number) => Math.abs(Math.abs(v[i]!) - 1) < 1e-9;

// The pin lies along X with the collar centred on x = 0.
export function measurePin(g: StepGeometry) {
  return {
    xPlanes: [...new Set(g.planes.filter((p) => isAxis(p.normal, 0)).map((p) => r3(p.origin[0])))].sort(
      (a, b) => a - b,
    ),
    radii: [...new Set(g.cylinders.map((c) => r3(c.radius)))].sort((a, b) => a - b),
    alongX: g.cylinders.every((c) => isAxis(c.axis, 0) && r3(c.origin[1]) === 0 && r3(c.origin[2]) === 0),
  };
}

export async function exportPin(p: PinParams, clearance: Clearance = NO_CLEARANCE) {
  const step = await buildPart({ partId: "pin", params: p, clearance }).blobSTEP().text();
  return { step, stats: analyseStep(step), geometry: stepGeometry(step) };
}
export const solids = (step: string) => (step.match(/MANIFOLD_SOLID_BREP/g) ?? []).length;
