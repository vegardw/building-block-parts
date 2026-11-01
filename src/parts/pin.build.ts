import { makeBox, makeCylinder } from "replicad";
import type { Shape3D } from "replicad";
import { SPEC, PIN, type Clearance } from "../spec";
import { pinSide, SNAP, type PinParams, type PinSide } from "./pin";
import { axleAlongZ } from "./axle.build";
import { cutAll, fuseAll } from "./booleans.build";

// Parameters are validated before this is called (see builders.ts).
// The collar is centred on the origin; each side is built along +Z (side 1 is
// then turned to point along -Z), and the pin is finally laid along X.
export function buildPin({ sideA, sideB, ends }: PinParams, clearance: Clearance): Shape3D {
  const a = pinSide(sideA);
  const b = pinSide(sideB);
  const half = (side: PinSide, other: PinSide) => pinHalf(side, other, ends === SNAP, clearance);
  const pin = half(b, a).fuse(half(a, b).rotate(180, [0, 0, 0], [1, 0, 0]));
  return pin.rotate(90, [0, 0, 0], [0, 1, 0]);
}

// Pieces reach this far past the centre so the halves overlap instead of
// meeting in coincident faces: a pin half into the other pin half, a stud or an
// axle into the collar. A collar never does so towards an axle or a stud, as
// its back face must stay at the centre.
const OVERLAP = 0.3;

// A cylinder on the Z axis between two heights.
const segment = (r: number, z0: number, z1: number) => makeCylinder(r, z1 - z0, [0, 0, z0], [0, 0, 1]);

function pinHalf(side: PinSide, other: PinSide, snap: boolean, c: Clearance): Shape3D {
  const boreR = PIN.boreD / 2;

  if (side.kind === "axle") {
    // Cross from inside the collar to a normal bevelled axle end.
    const length = side.studs * SPEC.pitch + 0.5;
    return axleAlongZ(length, "flush", "plain", c.axle).translate(0, 0, -0.5 + length / 2);
  }

  if (side.kind === "stud") {
    // An open stud on the back of the collar, as on a half pin; the bore runs through it.
    return segment((PIN.shaftD + c.pin) / 2, -OVERLAP, PIN.studHeight).cut(
      segment(boreR, -OVERLAP - 1, PIN.studHeight + 1),
    );
  }

  const tip = side.studs * SPEC.pitch;
  const shaftR = (PIN.shaftD + c.pin) / 2;
  const lipStart = snap ? tip - PIN.lipLength : tip;
  const back = other.kind === "pin" || other.kind === "friction" ? -OVERLAP : 0;
  // The collar, the shaft, the lip and the ribs are joined in one boolean, and the
  // bore and the slots cut in one, rather than one per piece (see booleans.build.ts).
  const added: Shape3D[] = [segment(shaftR, back, tip)];
  if (snap) added.push(segment((PIN.lipD + c.pin) / 2, lipStart, tip));

  if (side.kind === "friction") {
    // Four ribs per row at 45°, clear of the slots at 0° and 180°: one row next
    // to the collar, one next to the lip.
    for (const z0 of [PIN.collarWidth, lipStart - PIN.ribLength]) {
      for (let k = 0; k < 4; k++) {
        added.push(
          makeBox(
            [shaftR - 0.3, -PIN.ribWidth / 2, z0],
            [shaftR + PIN.ribHeight, PIN.ribWidth / 2, z0 + PIN.ribLength],
          ).rotate(45 + 90 * k, [0, 0, 0], [0, 0, 1]),
        );
      }
    }
  }

  // Bore: through, except next to an axle side, where it stops at the collar
  // (the collar carries the axle).
  const boreStart = other.kind === "axle" ? PIN.collarWidth : -OVERLAP - 1;
  const removed: Shape3D[] = [segment(boreR, boreStart, tip + 1)];

  if (snap) {
    // Two slots through the wall at 0° and 180°, so the tip can flex and the
    // lip pass through the hole. Square-ended: a round end would meet the shaft
    // in a curve that isn't a line, circle or ellipse.
    const out = (PIN.lipD + c.pin) / 2 + 1;
    removed.push(makeBox([-out, -PIN.slotWidth / 2, tip - PIN.slotLength], [out, PIN.slotWidth / 2, tip + 1]));
  }
  const collar = segment((SPEC.collarD + c.collar) / 2, back, PIN.collarWidth);
  return cutAll([fuseAll([collar, ...added]), ...removed]);
}
