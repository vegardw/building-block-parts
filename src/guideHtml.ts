// The calibration guide (docs/calibration.md) as HTML: the whole guide for the
// dialog, and each step's section for the Calibrate section. Imported on demand,
// so the markdown and its renderer stay out of the main bundle. The markdown is
// our own file, bundled at build time, so it is safe to insert as HTML.
import { marked } from "marked";
import guide from "../docs/calibration.md?raw";
import { CALIBRATION_STEPS, guideSection } from "./calibrationSteps";

const toHtml = (markdown: string): string => marked.parse(markdown, { async: false });

export const guideHtml: string = toHtml(guide);

// Step id -> its section; a missing section is caught by the guide's tests.
export const stepGuideHtml: Record<string, string> = Object.fromEntries(
  CALIBRATION_STEPS.map((step) => [step.id, toHtml(guideSection(guide, step.guide) ?? "")]),
);
