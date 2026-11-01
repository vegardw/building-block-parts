// Plate: the brick at a third of its height (brick.ts; CAD code in brick.build.ts).
import { BRICK } from "../spec";
import { brickPart } from "./brick";

const plate = brickPart(
  "plate",
  "Plate",
  BRICK.plateHeight,
  {
    label: "Common plates",
    sizes: [
      [1, 1],
      [1, 2],
      [1, 4],
      [2, 2],
      [2, 4],
      [4, 4],
    ],
  },
  " Three plates are as tall as a brick. With two plates between bricks with holes, their holes are 16 mm apart, so a beam can be pinned across them.",
);

export default plate;
