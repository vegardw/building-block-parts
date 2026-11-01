// The Dimensions dialog's tables (pure): the sizes the parts are made at with every
// fit setting at zero, a table per family of parts, with the fit setting that
// changes each size. A short version of docs/dimensions.md, whose sections the
// dialog links to for the sources. The numbers are read from spec.ts, so they can't
// drift from the parts; tests/dimensionTables.test.ts checks the rest.
import { SPEC, AXLE, PIN, BRICK, type ClearanceKey } from "./spec";
import { SOURCE_URL } from "./links";

export interface DimensionRow {
  feature: string;
  size: string; // in mm
  setting?: ClearanceKey; // the fit setting that changes it; none: no setting does
  // Only where a size isn't the design drawings' or isn't settled: these are the
  // values people who know the parts will ask about.
  note?: string;
}

export interface DimensionSection {
  id: string; // in the address: #dimensions/<id>
  title: string;
  heading: string; // the section of docs/dimensions.md with the sources (a test checks it exists)
  parts: readonly string[]; // the parts it covers; under Parts, they link here
  rows: DimensionRow[];
}

// 6.0, 6.51, 0.3: at most two decimals, at least one, as the docs write them.
const mm = (v: number): string => v.toFixed(2).replace(/(\.\d)0$/, "$1");
const { pitch } = SPEC;

const MEASURED = "Measured on genuine parts; the design drawings give 6.4.";
const NOT_MEASURED = "From the drawings; not yet measured on a genuine part.";

export const DIMENSION_SECTIONS: DimensionSection[] = [
  {
    id: "beam",
    title: "Beam (liftarm)",
    heading: "Beam (liftarm)",
    parts: ["beam"],
    rows: [
      { feature: "Hole spacing", size: mm(pitch) },
      {
        feature: "Length",
        size: `(holes − 1) × ${pitch} + ${mm(SPEC.width)}, round ends`,
        setting: "width",
      },
      { feature: "Width", size: mm(SPEC.width), setting: "width" },
      { feature: "Height", size: `${mm(SPEC.height)}; half height ${mm(SPEC.halfHeight)}`, setting: "height" },
      { feature: "Hole", size: mm(SPEC.holeD), setting: "hole" },
      {
        feature: "Counterbore, both faces",
        size: `${mm(SPEC.cboreD)} × ${mm(SPEC.cboreDepth)} deep`,
        setting: "hole",
        note: "Measured on genuine beams; the design drawings give 6.4.",
      },
    ],
  },
  {
    id: "axle",
    title: "Axle",
    heading: "Axle",
    parts: ["axle"],
    rows: [
      { feature: "Length", size: `studs × ${pitch}` },
      { feature: "Cross, tip to tip", size: mm(AXLE.crossD), setting: "axle" },
      {
        feature: "Arm width",
        size: mm(AXLE.armWidth),
        setting: "axle",
        note: "Not yet checked on a genuine axle.",
      },
      {
        feature: "Plain end",
        size: `face ${mm(AXLE.endInset)} inside the length, bevelled over ${mm(AXLE.bevelLength)}`,
      },
      {
        feature: "Notched end",
        size: `notch ${mm(AXLE.notchFrom)} to ${mm(AXLE.notchTo)} from the end, ${mm(AXLE.notchFloorD)} across`,
        setting: "axle",
      },
      { feature: "Stop", size: `${mm(SPEC.collarD)} × ${mm(AXLE.stopThickness)}`, setting: "collar", note: MEASURED },
      {
        feature: "Stop one stud in",
        size: `${mm(AXLE.stopInD)} × ${mm(AXLE.stopThickness)}`,
        setting: "collar",
        note: "Measured on one genuine axle.",
      },
      {
        feature: "Sleeve beside it",
        size: `${mm(AXLE.sleeveLength)} long, round, ${mm(AXLE.crossD)} across`,
        setting: "axle",
      },
      {
        feature: "Stud on the end",
        size: `${mm(AXLE.studD)} × ${mm(AXLE.studHeight)}, bore ${mm(AXLE.studBoreD)}`,
        setting: "stud",
        note: NOT_MEASURED,
      },
    ],
  },
  {
    id: "pin",
    title: "Pin",
    heading: "Pin",
    parts: ["pin"],
    rows: [
      { feature: "Length of a side", size: `${pitch} per stud, from the middle of the collar` },
      { feature: "Shaft", size: mm(PIN.shaftD), setting: "pin" },
      { feature: "Bore", size: mm(PIN.boreD) },
      {
        feature: "Collar",
        size: `${mm(SPEC.collarD)}, ${mm(PIN.collarWidth)} wide per pin side`,
        setting: "collar",
        note: MEASURED,
      },
      { feature: "Snap lip at the tip", size: `${mm(PIN.lipD)} × ${mm(PIN.lipLength)}`, setting: "pin" },
      { feature: "Slots", size: `two per tip, ${mm(PIN.slotWidth)} wide, ${mm(PIN.slotLength)} long` },
      {
        feature: "Friction ribs",
        size: `${mm(PIN.ribHeight)} high, ${mm(PIN.ribWidth)} wide, ${mm(PIN.ribLength)} long`,
        setting: "pin",
      },
      { feature: "Axle side", size: `the axle's cross, ${mm(AXLE.crossD)} × ${mm(AXLE.armWidth)}`, setting: "axle" },
      {
        feature: "Stud side (half pin)",
        size: `${mm(PIN.shaftD)} × ${mm(PIN.studHeight)}`,
        setting: "stud",
        note: NOT_MEASURED,
      },
    ],
  },
  {
    id: "brick",
    title: "Brick and plate",
    heading: "Brick and plate",
    parts: ["brick", "plate"],
    rows: [
      { feature: "Stud spacing", size: mm(pitch) },
      { feature: "Length and width", size: `studs × ${pitch} − ${mm(BRICK.gap)}`, setting: "width" },
      {
        feature: "Height, without the studs",
        size: `brick ${mm(BRICK.brickHeight)}, plate ${mm(BRICK.plateHeight)}`,
        setting: "height",
      },
      { feature: "Top", size: mm(BRICK.top) },
      {
        feature: "Studs",
        size: `${mm(BRICK.studD)} × ${mm(BRICK.studHeight)}`,
        setting: "stud",
        note: `Measured on genuine bricks. The design size is ${mm(BRICK.socketD)}, which the underside is made for: the difference is the grip.`,
      },
      {
        feature: "Underside, made for a stud of",
        size: mm(BRICK.socketD),
        setting: "underside",
        note: "As genuine undersides measure.",
      },
      {
        feature: "Ribs, two or more studs wide",
        size: `${mm(BRICK.ribWidth)} wide, ${mm((pitch - BRICK.gap - BRICK.socketD) / 2 - BRICK.wall)} deep, on ${mm(BRICK.wall)} walls`,
        setting: "underside",
      },
      {
        feature: "Tubes, two or more studs wide",
        size: `${mm(BRICK.tubeD)} outside, ${mm(BRICK.tubeBoreD)} inside`,
        setting: "underside",
      },
      {
        feature: "Walls, one stud wide",
        size: `${mm(BRICK.socketD)} apart (${mm((pitch - BRICK.gap - BRICK.socketD) / 2)} thick)`,
        setting: "underside",
      },
      {
        feature: "Bars, one stud wide",
        size: mm(BRICK.barD),
        setting: "underside",
        note: "Measured on genuine bricks (about 3.0 to 3.14); 3.2 by design.",
      },
    ],
  },
  {
    id: "brick-with-holes",
    title: "Brick with holes",
    heading: "Brick with holes",
    parts: ["brick-with-holes"],
    rows: [
      { feature: "Holes", size: "one between each two studs; under the stud of a 1 × 1" },
      {
        feature: "Hole",
        size: `${mm(SPEC.holeD)}, counterbores ${mm(SPEC.cboreD)} × ${mm(SPEC.cboreDepth)} on both faces, as the beam's`,
        setting: "hole",
      },
      {
        feature: "Hole centre",
        size: `${mm(BRICK.holeHeight)} above the bottom`,
        note: "For now: sources give 5.6 to 5.8, and measurements haven't settled it.",
      },
      {
        feature: "Boss round each hole, inside",
        size: `${mm(BRICK.bossD)} wide, flat underneath, ${mm(BRICK.holeHeight - BRICK.bossD / 2)} above the bottom`,
      },
      {
        feature: "Length and width",
        size: `studs × ${pitch} − ${mm(BRICK.gap)}, and ${mm(pitch - BRICK.gap)}`,
        setting: "width",
      },
      { feature: "Height, without the studs", size: mm(BRICK.brickHeight), setting: "height" },
      { feature: "Studs", size: `${mm(BRICK.studD)} × ${mm(BRICK.studHeight)}, as a brick's`, setting: "stud" },
      {
        feature: "Underside",
        size: `walls ${mm(BRICK.socketD)} apart and ${mm(BRICK.barD)} bars, as a brick one stud wide; a 1 × 1 has room for one stud, ${mm(BRICK.plateHeight - BRICK.top)} deep`,
        setting: "underside",
      },
    ],
  },
];

// The section a part under Parts links to.
export const dimensionSectionFor = (partId: string): DimensionSection | undefined =>
  DIMENSION_SECTIONS.find((s) => s.parts.includes(partId));

// docs/dimensions.md as GitHub shows it: the latest version, which the site is deployed from.
export const DIMENSIONS_DOC_URL = `${SOURCE_URL}/blob/main/docs/dimensions.md`;

// The anchor GitHub gives a heading: lower case, punctuation dropped, spaces to hyphens.
export const githubAnchor = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

export const sourcesUrl = (section: DimensionSection): string =>
  `${DIMENSIONS_DOC_URL}#${githubAnchor(section.heading)}`;
