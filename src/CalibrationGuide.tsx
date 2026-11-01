import { useEffect, useState } from "react";
import Dialog from "./Dialog";

type GuideModule = typeof import("./guideHtml");

// Loads the guide's HTML (guideHtml.ts) the first time `needed` is true, so
// visitors who never open it never download the markdown and its renderer.
export function useGuide(needed: boolean): { guide: GuideModule | null; failed: boolean } {
  const [guide, setGuide] = useState<GuideModule | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!needed || guide) return;
    import("./guideHtml").then((m) => setGuide(m)).catch(() => setFailed(true));
  }, [needed, guide]);

  return { guide, failed };
}

export const GUIDE_FAILED = "The guide could not be loaded. Reload the page and try again.";

// The calibration guide (docs/calibration.md) in a modal dialog.
export default function CalibrationGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { guide, failed } = useGuide(open);

  return (
    <Dialog open={open} onClose={onClose} label="Calibration guide" className="guide-dialog">
      {guide ? (
        <article className="guide" dangerouslySetInnerHTML={{ __html: guide.guideHtml }} />
      ) : (
        <p className="note">{failed ? GUIDE_FAILED : "Loading…"}</p>
      )}
    </Dialog>
  );
}
