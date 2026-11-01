import { Suspense, useEffect, useMemo, useRef, type ComponentProps, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { requiredDistance, shouldRefit, viewFrom, lightFrom, VIEW_FROM, type Bounds, type ViewSide } from "./cameraFit";

// threejs tends to use Y as the height, while replicad uses Z.
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

// Turning, zooming and panning with the mouse or touch: three.js's OrbitControls,
// with damping (the view glides to a stop). The canvas only draws on demand, so
// every change of the view asks for a frame, and each frame lets the damping move on.
//
// It also keeps the whole model in view when the model changes or the viewport is
// resized (window resize, phone rotation, layout change); the viewing direction is
// kept. See cameraFit.ts for when the user's own zoom and pan are left alone.
// `reset` changing (the Reset view button) fits the model from the starting view
// direction, whatever the user did; so does `side` changing (a part seen from below).
function CameraControls({ bounds, reset, side }: { bounds: Bounds | null; reset: number; side: ViewSide }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const domElement = useThree((s) => s.gl.domElement);
  const invalidate = useThree((s) => s.invalidate);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const fitted = useRef<{ radius: number; distance: number; center: THREE.Vector3 } | null>(null); // last automatic fit
  const lastReset = useRef(reset);
  const lastSide = useRef<ViewSide>("above"); // the camera starts above (see the Canvas)

  const controls = useMemo(() => {
    const c = new OrbitControls(camera);
    c.enableDamping = true;
    return c;
  }, [camera]);

  useEffect(() => {
    const redraw = () => invalidate(); // not `invalidate` itself: it takes a frame count, not the event
    controls.connect(domElement);
    controls.addEventListener("change", redraw);
    return () => {
      controls.removeEventListener("change", redraw);
      controls.dispose();
    };
  }, [controls, domElement, invalidate]);

  useFrame(() => {
    controls.update();
  }, -1);

  useEffect(() => {
    if (!bounds || !(bounds.radius > 0) || !(width > 0) || !(height > 0)) return;

    const last = fitted.current;
    const resetting = reset !== lastReset.current || side !== lastSide.current;
    lastReset.current = reset;
    lastSide.current = side;
    const refit =
      resetting ||
      shouldRefit({
        last,
        radius: bounds.radius,
        currentDistance: camera.position.distanceTo(controls.target),
        targetOffset: last ? controls.target.distanceTo(last.center) : 0,
      });
    if (!refit) return;

    const center = new THREE.Vector3(...bounds.center);
    const direction = new THREE.Vector3().subVectors(camera.position, controls.target);
    if (resetting || direction.lengthSq() === 0) direction.set(...viewFrom(side));
    direction.normalize();
    const distance = requiredDistance(camera.fov, bounds.radius, width / height);

    camera.position.copy(center).addScaledVector(direction, distance);
    controls.target.copy(center);
    controls.update();
    fitted.current = { radius: bounds.radius, distance, center };
    invalidate();
  }, [bounds, camera, controls, invalidate, width, height, reset, side]);

  return null;
}

interface ThreeContextProps extends Omit<ComponentProps<typeof Canvas>, "children"> {
  children?: ReactNode;
  onContextLost?: () => void; // the browser dropped the WebGL context (e.g. under memory pressure)
  bounds: Bounds | null; // bounding sphere of the model, used to fit the camera
  reset?: number; // change it to return to the starting view
  side?: ViewSide; // where the starting view looks from
}

export default function ThreeContext({
  children,
  bounds,
  reset = 0,
  side = "above",
  onContextLost,
  ...props
}: ThreeContextProps) {
  const dpr = Math.min(window.devicePixelRatio, 2);

  return (
    <Suspense fallback={null}>
      <Canvas
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "transparent",
        }}
        dpr={dpr}
        frameloop="demand"
        camera={{ position: [...VIEW_FROM] }}
        {...props}
        onCreated={({ gl }: RootState) => {
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault(); // lets the browser restore the context
            onContextLost?.();
          });
        }}
      >
        <CameraControls bounds={bounds} reset={reset} side={side} />
        <ambientLight intensity={4} />
        <pointLight position={[...lightFrom(side)]} />
        {children}
      </Canvas>
    </Suspense>
  );
}
