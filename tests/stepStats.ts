// Minimal STEP reader: reports which surface types the faces use and which
// curve types the edges use. No CAD dependency, so it runs on any STEP file.

const WRAPPER_CURVES = ["SURFACE_CURVE", "SEAM_CURVE", "INTERSECTION_CURVE"];

export interface StepStats {
  faceCount: number;
  faceTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
}

interface Entity {
  type: string;
  args: string;
}

// Split "a,(b,c),d" into top-level arguments, ignoring commas inside parentheses.
function splitArgs(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

function count(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export function analyseStep(text: string): StepStats {
  const entities = new Map<string, Entity>(); // id -> entity
  const pattern = /#(\d+)\s*=\s*([A-Z][A-Z0-9_]*)\s*\(([\s\S]*?)\)\s*;/g;
  for (const m of text.matchAll(pattern)) {
    entities.set(m[1]!, { type: m[2]!, args: m[3]! }); // the pattern's groups always match
  }

  // A missing argument or reference counts as UNKNOWN, which the tests reject like any other.
  const entityOf = (ref: string | undefined): Entity | undefined =>
    ref === undefined ? undefined : entities.get(ref.replace("#", ""));
  const typeOf = (ref: string | undefined): string => entityOf(ref)?.type ?? "UNKNOWN";

  const faceTypes: Record<string, number> = {};
  const edgeTypes: Record<string, number> = {};

  for (const { type, args } of entities.values()) {
    if (type === "ADVANCED_FACE") {
      // ADVANCED_FACE(name, (bounds), surface, same_sense)
      count(faceTypes, typeOf(splitArgs(args)[2]));
    } else if (type === "EDGE_CURVE") {
      // EDGE_CURVE(name, vertex1, vertex2, curve, same_sense)
      let ref = splitArgs(args)[3];
      let curveType = typeOf(ref);
      // Look through wrappers that carry the 3D curve as their 2nd argument.
      while (WRAPPER_CURVES.includes(curveType)) {
        ref = splitArgs(entityOf(ref)?.args ?? "")[1];
        curveType = typeOf(ref);
      }
      count(edgeTypes, curveType);
    }
  }

  const faceCount = Object.values(faceTypes).reduce((a, b) => a + b, 0);
  return { faceCount, faceTypes, edgeTypes };
}

// ---- Geometry: where the faces are, for dimension checks ------------------

export type Vec = [number, number, number];

export interface StepGeometry {
  millimetres: boolean; // the file declares its length unit as mm
  cylinders: { origin: Vec; axis: Vec; radius: number }[];
  planes: { origin: Vec; normal: Vec }[];
}

const numbers = (text: string): number[] => (text.match(/[-+]?[0-9.]+(?:[eE][-+]?\d+)?/g) ?? []).map(Number);

// Reads the surface of every face. Positions come from each surface's
// AXIS2_PLACEMENT_3D: a cylinder's origin is a point on its axis, a plane's
// origin a point on the plane.
export function stepGeometry(text: string): StepGeometry {
  const entities = new Map<string, Entity>();
  for (const m of text.matchAll(/#(\d+)\s*=\s*([A-Z][A-Z0-9_]*)\s*\(([\s\S]*?)\)\s*;/g)) {
    entities.set(m[1]!, { type: m[2]!, args: m[3]! }); // the pattern's groups always match
  }
  const get = (ref: string | undefined): Entity => {
    const e = ref === undefined ? undefined : entities.get(ref.replace("#", ""));
    if (!e) throw new Error(`STEP reference ${ref ?? "(missing)"} not found`);
    return e;
  };
  // CARTESIAN_POINT('',(x,y,z)) and DIRECTION('',(x,y,z)): the last three numbers.
  const vec = (ref: string | undefined): Vec => {
    const v = numbers(splitArgs(get(ref).args)[1] ?? "");
    if (v.length < 3) throw new Error(`STEP reference ${ref} is not a point or direction`);
    return v.slice(0, 3) as Vec;
  };
  const placement = (ref: string | undefined) => {
    const [, location, axis] = splitArgs(get(ref).args);
    return { origin: vec(location), axis: vec(axis) };
  };

  const geometry: StepGeometry = {
    millimetres: /SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)/.test(text),
    cylinders: [],
    planes: [],
  };
  for (const { type, args } of entities.values()) {
    if (type !== "ADVANCED_FACE") continue;
    const surface = get(splitArgs(args)[2]);
    const surfaceArgs = splitArgs(surface.args);
    if (surface.type === "CYLINDRICAL_SURFACE") {
      geometry.cylinders.push({ ...placement(surfaceArgs[1]), radius: Number(surfaceArgs[2]) });
    } else if (surface.type === "PLANE") {
      const { origin, axis } = placement(surfaceArgs[1]);
      geometry.planes.push({ origin, normal: axis });
    }
  }
  return geometry;
}
