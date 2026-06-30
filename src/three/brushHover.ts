import * as THREE from 'three';

// Shared brush hover state: where on the surface the brush is and which way
// that surface faces. Written by PaintController, read by the 3D brush decal
// (and the 2D fallback cursor). A plain module — no React re-renders.
export const brushHover = {
  active: false,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
};
