import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import ErrorBoundary from "./ErrorBoundary";
import { boundsOf, type ViewSide } from "./cameraFit";
import { webglAvailable } from "./webgl";
import type { MeshData } from "./parts/types";

// The 3D view is a chunk of its own (see Scene.tsx), loaded once WebGL is known to work.
class SceneLoadError extends Error {}
const loadScene = () =>
  import("./Scene").catch((e: unknown) => {
    throw new SceneLoadError(e instanceof Error ? e.message : String(e));
  });
const Scene = lazy(loadScene);

// Shown instead of the 3D view when it can't run. The STEP download doesn't need it.
function PreviewUnavailable({
  reason,
  onRetry,
  retryLabel = "Try again",
}: {
  reason: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div role="status" className="viewer-message">
      <div className="fallback">
        <p>{reason}</p>
        <p className="note">You can still download the STEP file.</p>
        {onRetry && (
          <button type="button" className="button secondary" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

interface ViewerProps {
  mesh: MeshData | null;
  busy: boolean; // a newer model is being built: the shown one is kept, with a badge
  stale: boolean; // the inputs are invalid: the shown model is the last valid one
  message: string; // shown while there is no model
  spinner: boolean;
  side: ViewSide; // where the starting view looks from: below for a part whose features face down
}

// How to move the view, for people new to 3D views; touch screens get their own words.
const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
const CONTROLS = touch
  ? "Drag to turn · pinch to zoom · two fingers to move"
  : "Drag to turn · scroll to zoom · right-drag to move";

// "39.2 × 7.2 × 8.0 mm": the model's size along X, Y and Z, to one decimal (the
// mesh is within a few thousandths of a millimetre of the exact part).
const sizeText = (size: [number, number, number]) => `${size.map((d) => d.toFixed(1)).join(" × ")} mm`;

// The 3D preview, or a message when there is no model or no WebGL.
export default function Viewer({ mesh, busy, stale, message, spinner, side }: ViewerProps) {
  const [previewSupported] = useState(() => webglAvailable());
  const [previewLost, setPreviewLost] = useState(false); // the browser dropped the WebGL context
  const [previewKey, setPreviewKey] = useState(0); // changing it remounts the 3D view
  const [viewReset, setViewReset] = useState(0); // changing it returns to the starting view
  const bounds = useMemo(() => (mesh ? boundsOf(mesh.faces.vertices) : null), [mesh]);
  const showing3D = mesh && previewSupported && !previewLost;

  // Start fetching the 3D view now, alongside the CAD engine, not when the first model arrives.
  // A failure shows when the view is first needed.
  useEffect(() => {
    if (previewSupported) {
      loadScene().catch(() => {
        // shown by the error boundary below
      });
    }
  }, [previewSupported]);

  return (
    <section className={stale ? "viewer stale" : "viewer"} aria-label="3D preview">
      {mesh ? (
        <>
          {!previewSupported ? (
            <PreviewUnavailable reason="The 3D preview isn't available: WebGL is turned off or not supported in this browser." />
          ) : previewLost ? (
            <PreviewUnavailable
              reason="The 3D preview stopped because the browser freed its graphics memory."
              onRetry={() => {
                setPreviewLost(false);
                setPreviewKey((k) => k + 1);
              }}
            />
          ) : (
            <ErrorBoundary
              key={previewKey}
              fallback={(error, reset) =>
                error instanceof SceneLoadError ? (
                  // A failed chunk stays failed until the page is loaded again.
                  <PreviewUnavailable
                    reason="The 3D preview couldn't be loaded. Check the connection, then reload the page."
                    onRetry={() => window.location.reload()}
                    retryLabel="Reload page"
                  />
                ) : (
                  <PreviewUnavailable
                    reason="The 3D preview crashed."
                    onRetry={() => {
                      reset();
                      setPreviewKey((k) => k + 1);
                    }}
                  />
                )
              }
            >
              <Suspense fallback={<div className="viewer-message">Loading the 3D view…</div>}>
                <Scene
                  mesh={mesh}
                  bounds={bounds}
                  reset={viewReset}
                  side={side}
                  onContextLost={() => setPreviewLost(true)}
                />
              </Suspense>
            </ErrorBoundary>
          )}
          {(busy || stale) && (
            <div role="status" className="badge">
              {busy ? "Updating…" : "Showing the last valid part"}
            </div>
          )}
          {showing3D && (
            <button type="button" className="view-reset" onClick={() => setViewReset((r) => r + 1)}>
              Reset view
            </button>
          )}
          <div className="view-footer">
            {showing3D && <p className="view-help">{CONTROLS}</p>}
            {bounds && (
              <p className="view-size" title="Length × width × height: the part's size along X, Y and Z">
                <span className="visually-hidden">Size: </span>
                {sizeText(bounds.size)}
              </p>
            )}
          </div>
        </>
      ) : (
        <div role="status" className="viewer-message">
          <span className="loading">
            {spinner && <span className="spinner" aria-hidden="true" />}
            {message}
          </span>
        </div>
      )}
    </section>
  );
}
