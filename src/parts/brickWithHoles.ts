// Brick with holes: part definition (pure data and checks; the CAD code is in
// brickWithHoles.build.ts). A brick one stud wide with the beam's holes across it,
// one between each two studs, or under the stud on a 1 × 1, their centres
// BRICK.holeHeight above the bottom (docs/dimensions.md, "Brick with holes").
import { SPEC, BRICK, MIN_WALL, EPS, type Clearance } from "../spec";
import type { PartDefinition } from "./types";

export type BrickWithHolesParams = { length: number };

// The longest genuine one is 1 × 16.
export const MAX_LENGTH = 16;

// The holes' positions along X, centred on 0.
export const holePositions = (length: number): number[] =>
  length === 1 ? [0] : Array.from({ length: length - 1 }, (_, i) => (i - (length - 2) / 2) * SPEC.pitch);

// The sizes a part comes out at with the fit settings, and the walls its holes leave.
export function brickWithHolesDimensions(length: number, c: Clearance) {
  const height = BRICK.brickHeight + c.height;
  const cboreD = SPEC.cboreD + c.hole;
  return {
    length: length * SPEC.pitch - BRICK.gap + c.width,
    width: SPEC.pitch - BRICK.gap + c.width,
    height,
    holeD: SPEC.holeD + c.hole,
    cboreD,
    studD: BRICK.studD + c.stud,
    barD: length > 1 ? BRICK.barD - c.underside : null,
    inside: BRICK.socketD + c.underside, // between the walls, which hold the stud
    // Inside, the boss round each hole; above, the top of the brick.
    bossWall: (BRICK.bossD - cboreD) / 2,
    topWall: height - BRICK.holeHeight - cboreD / 2,
  };
}

const brickWithHoles: PartDefinition<BrickWithHolesParams> = {
  id: "brick-with-holes",
  name: "Brick with holes",
  clearance: ["hole", "stud", "underside", "width", "height"],
  presets: {
    label: "Common bricks with holes",
    options: [2, 4, 6, 8].map((length) => ({ label: `1 × ${length}`, params: { length } })),
  },
  params: [
    {
      key: "length",
      label: "Length (studs)",
      type: "int",
      min: 1,
      max: MAX_LENGTH,
      step: 1,
      default: 4,
      hint: "One hole between each two studs; a 1 × 1 has its hole under the stud.",
    },
  ],

  // Cross-field checks, run after the generic range checks.
  validate({ length }, clearance) {
    const d = brickWithHolesDimensions(length, clearance);
    if (d.bossWall < MIN_WALL - EPS) {
      return `The wall round the counterbore would be only ${d.bossWall.toFixed(2)} mm (minimum ${MIN_WALL} mm). Reduce the hole diameter.`;
    }
    if (d.topWall < MIN_WALL - EPS) {
      return `The top above the counterbores would be only ${d.topWall.toFixed(2)} mm (minimum ${MIN_WALL} mm). Reduce the hole diameter or increase the part height.`;
    }
    return null;
  },

  info({ length }) {
    const holes = holePositions(length).length;
    const long = (length * SPEC.pitch - BRICK.gap).toFixed(1);
    const tall = (BRICK.brickHeight + BRICK.studHeight).toFixed(1);
    return (
      `${long} × ${(SPEC.pitch - BRICK.gap).toFixed(1)} mm, ${BRICK.brickHeight} mm tall (${tall} mm with the studs); ` +
      `${holes} ${holes === 1 ? "hole" : "holes"}, ${BRICK.holeHeight} mm up. With two plates between bricks with ` +
      "holes, their holes are 16 mm apart, so a beam can be pinned across them."
    );
  },

  // Tiles shown with the fit settings: the sizes they result in.
  summary({ length }, clearance) {
    const d = brickWithHolesDimensions(length, clearance);
    const mm = (v: number) => `${v.toFixed(2)} mm`;
    return [
      { label: "Length", value: mm(d.length) },
      { label: "Width", value: mm(d.width) },
      { label: "Height", value: mm(d.height) },
      { label: "Hole ⌀", value: mm(d.holeD) },
      { label: "Counterbore ⌀", value: mm(d.cboreD) },
      { label: "Stud ⌀", value: mm(d.studD) },
      ...(d.barD === null ? [] : [{ label: "Bar ⌀", value: mm(d.barD) }]),
      { label: "Inside", value: mm(d.inside) },
    ];
  },

  describe: ({ length }) => `1 × ${length}`,

  filename: ({ length }) => `brick-with-holes-1x${length}`,
};

export default brickWithHoles;
