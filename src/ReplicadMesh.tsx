import { memo, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry } from "three";
import type { MeshData } from "./parts/types";

interface ShapeMeshesProps {
  faces: MeshData["faces"];
  edges: MeshData["edges"];
}

// The model's faces and edge lines. Each new mesh gets its own geometry, built
// straight on the typed arrays the worker handed over (wrapped, not copied), and
// the previous geometry is freed from the graphics memory.
export default memo(function ShapeMeshes({ faces, edges }: ShapeMeshesProps) {
  const invalidate = useThree((s) => s.invalidate);

  const body = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setIndex(new BufferAttribute(faces.triangles, 1));
    geometry.setAttribute("position", new BufferAttribute(faces.vertices, 3));
    geometry.setAttribute("normal", new BufferAttribute(faces.normals, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }, [faces]);

  const lines = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(edges.lines, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }, [edges]);

  // The canvas only redraws on demand: draw the new model, and free the old one once replaced.
  useEffect(() => {
    invalidate();
    return () => {
      body.dispose();
      lines.dispose();
    };
  }, [body, lines, invalidate]);

  return (
    <group>
      <mesh geometry={body}>
        {/* the offsets are here to avoid z fighting between the mesh and the lines */}
        <meshStandardMaterial color="#5a8296" polygonOffset polygonOffsetFactor={2.0} polygonOffsetUnits={1.0} />
      </mesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#3c5a6e" />
      </lineSegments>
    </group>
  );
});
