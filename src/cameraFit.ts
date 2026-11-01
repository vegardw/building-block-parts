// Rules for fitting the camera to a model. Pure functions, so they are easy to test.

export const MARGIN = 1.1; // free space around the model
export const REFIT_THRESHOLD = 0.1; // the model size must change by >10% to force a refit
export const ZOOM_TOLERANCE = 0.02; // camera distance differing >2% from the last fit counts as user zoom
export const PAN_TOLERANCE = 0.01; // target moved >1% of the model radius counts as user pan

// Where the preview first looks from (Z is up): front left and above, so +X runs
// to the right. Every part puts its first end at -X (an axle's End 1, a pin's
// Side 1, a calibration part's smaller values: the flat end or the small end),
// so the preview shows it on the left, as the form and the Result row list it.
// The light comes from the same side, so the faces in view are lit.
export const VIEW_FROM: readonly [number, number, number] = [-20, -40, 50];
export const LIGHT_FROM: readonly [number, number, number] = [-100, -100, 100];

// Distance at which a sphere of `radius` fits the narrower of the vertical and
// horizontal fields of view, with MARGIN around it.
export function requiredDistance(fovDegrees: number, radius: number, aspect: number): number {
  const vfov = (fovDegrees * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  return (radius / Math.sin(Math.min(vfov, hfov) / 2)) * MARGIN;
}

// The last automatic fit (null before the first).
export interface LastFit {
  radius: number;
  distance: number;
}

export interface RefitInput {
  last: LastFit | null;
  radius: number; // current model radius
  currentDistance: number; // current camera distance to its target
  targetOffset: number; // how far the target moved from the last fit's centre
}

// Decides whether to move the camera. Called when the model or the viewport
// size changes:
//  - first fit, or the model's size changed a lot: always refit
//  - otherwise refit only if the user hasn't zoomed or panned, so a window resize
//    keeps an inspected detail in view but keeps an untouched view fitted.
export function shouldRefit({ last, radius, currentDistance, targetOffset }: RefitInput): boolean {
  if (!last) return true;
  if (Math.abs(radius - last.radius) / last.radius > REFIT_THRESHOLD) return true;
  const zoomed = Math.abs(currentDistance - last.distance) / last.distance > ZOOM_TOLERANCE;
  const panned = targetOffset > PAN_TOLERANCE * last.radius;
  return !zoomed && !panned;
}

// Bounding sphere of a model (its centre and radius), and the size of its box.
export interface Bounds {
  center: [number, number, number];
  radius: number;
  size: [number, number, number]; // along X, Y and Z; from the mesh, so within its tolerance of the exact size
}

// Bounds of a flat [x, y, z, x, y, z, ...] vertex list: box centre, half diagonal, box size.
export function boundsOf(vertices: ArrayLike<number> | null | undefined): Bounds | null {
  if (!vertices || vertices.length < 3) return null;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    for (const k of [0, 1, 2] as const) {
      const v = vertices[i + k] ?? NaN; // always there: i + 2 < length
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    radius: Math.hypot(...size) / 2,
    size,
  };
}
