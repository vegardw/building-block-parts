// True if the browser can create a WebGL context. The 3D preview needs it; the
// STEP export does not.
export function webglAvailable(doc: Pick<Document, "createElement"> = document): boolean {
  try {
    const canvas = doc.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
