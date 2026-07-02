import * as THREE from 'three';

// Module handle to the live PhotoBoard so a PFP capture can crop to exactly
// the backdrop's on-screen rectangle instead of the whole viewport.
export const photoBoardRig: { group: THREE.Group | null; width: number; height: number } = {
  group: null,
  width: 0,
  height: 0,
};
