// Types shared by the part registry, the worker and the UI.
import type { Clearance, ClearanceKey } from "../spec";

// Numeric parameter values of a part, e.g. { holes: 5 }.
export type ParamValues = Record<string, number>;
// The same parameters as typed in the form.
export type ParamText = Record<string, string>;

export interface NumberParamDef {
  key: string;
  label: string;
  type: "int" | "number";
  min: number;
  max: number;
  // With a step, the field gets −/+ buttons, and a value must lie on the grid
  // min, min + step, ... (an axle's half studs).
  step?: number;
  default: number;
  hint?: string;
}

// A pick from a list (shown as a select, or as a row of buttons for a few
// short options). Values are numbers so every parameter fits ParamValues; the
// form keeps them as text like the others.
export interface ChoiceParamDef {
  key: string;
  label: string;
  type: "choice";
  buttons?: boolean;
  options: { value: number; label: string }[];
  default: number;
  hint?: string;
}

export type ParamDef = NumberParamDef | ChoiceParamDef;

// A common combination of parameters, offered as a quick pick above the form.
export interface Preset {
  label: string;
  params: ParamValues; // the parameters it sets; the others keep their values
}

export interface SummaryItem {
  label: string;
  value: string;
}

// What the worker is asked to build.
export interface BuildRequest {
  partId: string;
  params: ParamValues;
  clearance: Clearance;
}

// A part's 3D preview: its triangles and its edges as line segments. Typed arrays,
// so the worker can hand them to the page without copying them (Comlink's transfer).
export interface MeshData {
  faces: {
    vertices: Float32Array<ArrayBuffer>; // x, y, z of each vertex
    normals: Float32Array<ArrayBuffer>; // the surface's normal at each vertex, for smooth shading
    triangles: Uint32Array<ArrayBuffer>; // three vertex indices per triangle
  };
  edges: { lines: Float32Array<ArrayBuffer> }; // x, y, z of both ends of each segment
}

// The downloaded file: STEP keeps the exact curves (the reason this project
// exists); STL is a triangle mesh made from the exact solid, for slicers that
// don't open STEP.
export type FileFormat = "step" | "stl";

// Several parts in one file ("Download all", the parts list): a part, how many
// copies, and the name its solids get in a STEP file.
export interface SetItem {
  request: BuildRequest;
  count: number;
  name: string;
}

// What a calibration part finds and how its features are read: the Calibrate
// section draws its features in order and saves the one picked as `setting`.
export interface CalibrationSpec {
  setting: ClearanceKey;
  feature: string; // one feature, e.g. "hole"
  ends: readonly [string, string]; // the part's ends, smallest value first
  tabs: boolean; // tabs mark the middle feature
  best: string; // which feature to pick, e.g. "the smallest hole in which ..."
}

// The methods use method syntax on purpose: it makes their parameter types
// bivariant, so a part with specific parameters (e.g. { holes: number }) fits in
// the shared PartDefinition list.
export interface PartDefinition<P extends ParamValues = ParamValues> {
  id: string;
  name: string;
  // The global clearance fields this part can use (shown as its fit settings); [] = none.
  clearance: readonly ClearanceKey[];
  // Optional: the ones these parameters use, when some depend on them (a pin's
  // axle or stud side, an axle's stops); a subset of `clearance`. The fit box, the
  // file name's "-adjusted", rebuilds and validation count only these (settingsUsed).
  uses?(params: P): readonly ClearanceKey[];
  // Only on calibration parts, which are listed under Calibrate instead of Parts.
  calibration?: CalibrationSpec;
  params: ParamDef[];
  // Quick picks above the form, under a heading such as "Common pins".
  presets?: { label: string; options: Preset[] };
  // Where the preview first looks from: "below" for a part whose features face
  // down as it is printed (the underside calibration bar); above otherwise.
  view?: "below";
  // Cross-field checks, run after the generic range checks.
  validate?(params: P, clearance: Clearance): string | null;
  // Tiles shown with the fit settings: the sizes they result in.
  summary?(params: P, clearance: Clearance): SummaryItem[];
  // Note shown under the parameter fields.
  info?(params: P): string;
  // A short description of the parameters ("7 holes, full height"), for the parts
  // list and the solids' names in a file with several parts. Without it, the file name.
  describe?(params: P): string;
  filename(params: P): string;
}
