// The 3D view itself: three.js and React Three Fiber, about two thirds of the
// app's code. Viewer.tsx loads it as a separate chunk, so the form shows without
// waiting for it.
import ThreeContext from "./ThreeContext";
import ReplicadMesh from "./ReplicadMesh";
import type { Bounds } from "./cameraFit";
import type { MeshData } from "./parts/types";

interface SceneProps {
  mesh: MeshData;
  bounds: Bounds | null;
  reset: number; // change it to return to the starting view
  onContextLost: () => void;
}

export default function Scene({ mesh, bounds, reset, onContextLost }: SceneProps) {
  return (
    <ThreeContext bounds={bounds} reset={reset} onContextLost={onContextLost}>
      <ReplicadMesh edges={mesh.edges} faces={mesh.faces} />
    </ThreeContext>
  );
}
