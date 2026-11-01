import { cast, getOC } from "replicad";
import type { Shape3D } from "replicad";
import { as3D } from "./shapes";

// Joins or cuts many pieces in one boolean operation: the first shape with all
// the others as tools. The tools may overlap each other (a bore and its
// counterbore, two axle sections): unlike the solids in a compound used as one
// tool, separate tools are intersected with each other.
//
// One operation instead of one per piece is faster, and it matters for memory:
// the engine keeps some memory after every boolean (about 0.2 MB even for two
// small cylinders) that nothing on our side can give back, deleting the results
// and the builder included (docs/architecture.md, "Memory").
function booleanAll(kind: "fuse" | "cut", [first, ...rest]: readonly [Shape3D, ...Shape3D[]]): Shape3D {
  if (rest.length === 0) return first;
  const oc = getOC();
  const builder = kind === "fuse" ? new oc.BRepAlgoAPI_Fuse() : new oc.BRepAlgoAPI_Cut();
  const objects = new oc.NCollection_List_TopoDS_Shape();
  const tools = new oc.NCollection_List_TopoDS_Shape();
  try {
    objects.Append(first.wrapped);
    for (const shape of rest) tools.Append(shape.wrapped);
    builder.SetArguments(objects);
    builder.SetTools(tools);
    builder.Build();
    if (builder.HasErrors()) throw new Error(`The kernel could not ${kind} the pieces.`);
    builder.SimplifyResult(true, true, 0.001); // merge faces split by the operation, as replicad's fuse and cut do
    return as3D(cast(builder.Shape()));
  } finally {
    builder.delete();
    objects.delete();
    tools.delete();
  }
}

export const fuseAll = (shapes: readonly [Shape3D, ...Shape3D[]]): Shape3D => booleanAll("fuse", shapes);
export const cutAll = (shapes: readonly [Shape3D, ...Shape3D[]]): Shape3D => booleanAll("cut", shapes);
