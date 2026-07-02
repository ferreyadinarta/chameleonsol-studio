import * as THREE from 'three';

// Shared brush hover state: where on the surface the brush is and which way
// that surface faces. Written by PaintController, read by the 3D brush decal
// (and the 2D fallback cursor). A plain module — no React re-renders.
export const brushHover = {
  active: false,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
  // World units per unit of UV-space distance at the hovered triangle — lets
  // the cursor's radius match what will actually get painted there. UV
  // texel density varies a lot across the body (a finger vs. the torso pack
  // very different amounts of surface into the same UV area), so this is
  // recomputed per-hover rather than using one constant for the whole figure.
  uvToWorldScale: 1,
};
