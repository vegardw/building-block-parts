// The page address's #hash (pure). Each section, part and calibration step has
// its own address (#parts/pin, #calibrate/axle), with the parameters after a ?
// (#parts/beam?holes=7&height=0), so the back button, links and bookmarks work;
// #guide opens the calibration guide over the current section, #dimensions the
// dimensions (#dimensions/pin: at the pin's table).
import type { ParamValues } from "./parts/types";

export type View = "parts" | "calibrate";

// A document the address opens in a dialog over the current section.
export type Doc = { kind: "guide" } | { kind: "dimensions"; section: string | null }; // section: not checked here

export interface Route {
  view: View | null; // null: keep the current section
  id: string | null; // the part or step named after the section; not checked here
  query: Record<string, string> | null; // parameters, as text; not checked here
  doc: Doc | null;
}

const NONE: Route = { view: null, id: null, query: null, doc: null };

export function readHash(hash: string): Route {
  if (hash === "") return { ...NONE, view: "parts" };
  if (hash === "#guide") return { ...NONE, doc: { kind: "guide" } };
  const [path = "", search] = hash.slice(1).split("?");
  const [section, id = ""] = path.split("/");
  if (section === "dimensions") return { ...NONE, doc: { kind: "dimensions", section: id || null } };
  const view: View | null =
    section === "parts"
      ? "parts"
      : section === "calibrate" || section === "calibration" // the guide's address before the Calibrate section existed
        ? "calibrate"
        : null;
  if (!view) return NONE;
  const query = search ? Object.fromEntries(new URLSearchParams(search)) : null;
  return { view, id: id || null, query, doc: null };
}

const withQuery = (path: string, params?: ParamValues) =>
  params ? `${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : path;

export const partHash = (id: string, params?: ParamValues): string => withQuery(`#parts/${id}`, params);
export const stepHash = (id: string, params?: ParamValues): string => withQuery(`#calibrate/${id}`, params);
export const dimensionsHash = (section?: string): string => (section ? `#dimensions/${section}` : "#dimensions");
