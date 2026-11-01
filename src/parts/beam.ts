// Beam: part definition (pure data and checks; the CAD code is in beam.build.ts).
// Full height or half height (thin liftarm): both sources give the same holes and
// counterbores, only the thickness differs (docs/dimensions.md).
import { SPEC, MIN_WALL, MAX_STUDS, EPS, type Clearance } from "../spec";
import type { PartDefinition } from "./types";

export type BeamParams = { holes: number; height: number };

// Values of the height choice; stored in saved settings, so they never change.
export const FULL = 0;
export const HALF = 1;

export const nominalHeight = (height: number): number => (height === HALF ? SPEC.halfHeight : SPEC.height);

export function beamDimensions(clearance: Clearance, nominal: number = SPEC.height) {
  const width = SPEC.width + clearance.width;
  const height = nominal + clearance.height;
  const holeD = SPEC.holeD + clearance.hole;
  const cboreD = SPEC.cboreD + clearance.hole;
  return { width, height, holeD, cboreD, wall: (width - cboreD) / 2 };
}

const beam: PartDefinition<BeamParams> = {
  id: "beam",
  name: "Beam (liftarm)",
  clearance: ["hole", "width", "height"],
  params: [
    { key: "holes", label: "Length (number of holes)", type: "int", min: 2, max: MAX_STUDS, step: 1, default: 3 },
    {
      key: "height",
      label: "Height",
      type: "choice",
      buttons: true,
      options: [
        { value: FULL, label: `Full (${SPEC.height} mm)` },
        { value: HALF, label: `Half (${SPEC.halfHeight} mm)` },
      ],
      default: FULL,
      hint: "A half-height beam (thin liftarm) has the same holes and counterbores, at half the thickness.",
    },
  ],

  // Cross-field checks, run after the generic range checks.
  validate({ height }, clearance) {
    const d = beamDimensions(clearance, nominalHeight(height));
    if (d.wall < MIN_WALL - EPS) {
      return `The wall beside the counterbore would be only ${d.wall.toFixed(2)} mm (minimum ${MIN_WALL} mm). Reduce the hole increase or the width reduction.`;
    }
    if (d.height <= SPEC.cboreDepth * 2) return "Beam height is too small for the counterbores.";
    return null;
  },

  // Tiles shown with the fit settings: the sizes they result in.
  summary({ height }, clearance) {
    const d = beamDimensions(clearance, nominalHeight(height));
    return [
      { label: "Width", value: `${d.width.toFixed(2)} mm` },
      { label: "Height", value: `${d.height.toFixed(2)} mm` },
      { label: "Hole ⌀", value: `${d.holeD.toFixed(2)} mm` },
      { label: "Counterbore ⌀", value: `${d.cboreD.toFixed(2)} mm` },
      { label: "Wall", value: `${d.wall.toFixed(2)} mm` },
    ];
  },

  describe: ({ holes, height }) => `${holes} holes, ${height === HALF ? "half" : "full"} height`,

  // The half-height beam keeps the file name it had as a part of its own.
  filename: ({ holes, height }) => `${height === HALF ? "half-beam" : "beam"}-${holes}-holes`,
};

export default beam;
