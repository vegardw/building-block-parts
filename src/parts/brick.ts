// Brick: part definition (pure data and checks; the CAD code is in brick.build.ts).
// Studs on top, and an underside that holds the studs of the part below: tubes
// and ribbed walls on parts two or more studs wide, bars and walls that touch the
// studs on parts one stud wide (docs/dimensions.md, "Brick and plate"). The plate
// is the same part at a third of the height (plate.ts).
import { SPEC, BRICK, MAX_STUDS, type Clearance } from "../spec";
import type { PartDefinition, Preset } from "./types";

export type BrickParams = { width: number; length: number };

// The widest part: a 16 × 32 plate is 127.8 × 255.8 mm.
export const MAX_WIDTH = 16;

// Width and length may be given either way round: 4 × 2 is the same part as
// 2 × 4, laid along its longer side.
export const studsOf = ({ width, length }: BrickParams) => ({
  across: Math.min(width, length),
  along: Math.max(width, length),
});

// The sizes a part comes out at with the fit settings, for the summary tiles.
export function brickDimensions(params: BrickParams, nominalHeight: number, c: Clearance) {
  const { across, along } = studsOf(params);
  const outside = (studs: number) => studs * SPEC.pitch - BRICK.gap + c.width;
  return {
    length: outside(along),
    width: outside(across),
    height: nominalHeight + c.height,
    studD: BRICK.studD + c.stud,
    tubeD: across > 1 ? BRICK.tubeD - c.underside : null,
    barD: across === 1 && along > 1 ? BRICK.barD - c.underside : null,
    inside: across === 1 ? BRICK.socketD + c.underside : null, // between the walls, which hold the stud
  };
}

const sizes = (list: [number, number][]): Preset[] =>
  list.map(([width, length]) => ({ label: `${width} × ${length}`, params: { width, length } }));

// What Brick and Plate share; they differ in height, name and quick picks.
export function brickPart(
  id: string,
  name: string,
  nominalHeight: number,
  presets: { label: string; sizes: [number, number][] },
  note = "",
): PartDefinition<BrickParams> {
  return {
    id,
    name,
    clearance: ["stud", "underside", "width", "height"],
    presets: { label: presets.label, options: sizes(presets.sizes) },
    params: [
      {
        key: "width",
        label: "Width (studs)",
        type: "int",
        min: 1,
        max: MAX_WIDTH,
        step: 1,
        default: 2,
        // Non-breaking spaces keep "2 × 4" on one line.
        hint: "Studs across and along. 4\u00a0×\u00a02 is the same part as 2\u00a0×\u00a04, laid along its longer side.",
      },
      { key: "length", label: "Length (studs)", type: "int", min: 1, max: MAX_STUDS, step: 1, default: 4 },
    ],

    info(params) {
      const { across, along } = studsOf(params);
      const outside = (studs: number) => (studs * SPEC.pitch - BRICK.gap).toFixed(1);
      const tall = (nominalHeight + BRICK.studHeight).toFixed(1);
      return `${outside(along)} × ${outside(across)} mm, ${nominalHeight} mm tall (${tall} mm with the studs).${note}`;
    },

    // Tiles shown with the fit settings: the sizes they result in.
    summary(params, clearance) {
      const d = brickDimensions(params, nominalHeight, clearance);
      const mm = (v: number) => `${v.toFixed(2)} mm`;
      return [
        { label: "Length", value: mm(d.length) },
        { label: "Width", value: mm(d.width) },
        { label: "Height", value: mm(d.height) },
        { label: "Stud ⌀", value: mm(d.studD) },
        ...(d.tubeD === null ? [] : [{ label: "Tube ⌀", value: mm(d.tubeD) }]),
        ...(d.barD === null ? [] : [{ label: "Bar ⌀", value: mm(d.barD) }]),
        ...(d.inside === null ? [] : [{ label: "Inside", value: mm(d.inside) }]),
      ];
    },

    describe(params) {
      const { across, along } = studsOf(params);
      return `${across} × ${along}`;
    },

    filename(params) {
      const { across, along } = studsOf(params);
      return `${id}-${across}x${along}`;
    },
  };
}

const brick = brickPart("brick", "Brick", BRICK.brickHeight, {
  label: "Common bricks",
  sizes: [
    [1, 1],
    [1, 2],
    [1, 4],
    [2, 2],
    [2, 3],
    [2, 4],
  ],
});

export default brick;
