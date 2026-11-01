// The page address's #hash (pure). Each section, part and calibration step has
// its own address (#parts/pin, #calibrate/axle), with the parameters after a ?
// (#parts/beam?holes=7&height=0), so the back button, links and bookmarks work;
// #guide opens the calibration guide over the current section.
import type { ParamValues } from "./parts/types";

export type View = "parts" | "calibrate";

export interface Route {
  view: View | null; // null: keep the current section
  id: string | null; // the part or step named after the section; not checked here
  query: Record<string, string> | null; // parameters, as text; not checked here
  guide: boolean;
}

const NONE: Route = { view: null, id: null, query: null, guide: false };

export function readHash(hash: string): Route {
  if (hash === "") return { ...NONE, view: "parts" };
  if (hash === "#guide") return { ...NONE, guide: true };
  const [path = "", search] = hash.slice(1).split("?");
  const [section, id = ""] = path.split("/");
  const view: View | null =
    section === "parts"
      ? "parts"
      : section === "calibrate" || section === "calibration" // the guide's address before the Calibrate section existed
        ? "calibrate"
        : null;
  if (!view) return NONE;
  const query = search ? Object.fromEntries(new URLSearchParams(search)) : null;
  return { view, id: id || null, query, guide: false };
}

const withQuery = (path: string, params?: ParamValues) =>
  params ? `${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : path;

export const partHash = (id: string, params?: ParamValues): string => withQuery(`#parts/${id}`, params);
export const stepHash = (id: string, params?: ParamValues): string => withQuery(`#calibrate/${id}`, params);
