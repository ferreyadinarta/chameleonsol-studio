import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Module handle to the live OrbitControls so sessions can snapshot/restore the
// camera angle, distance, and target.
export const cameraRig: { controls: OrbitControlsImpl | null } = { controls: null };

export type CameraState = {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
};

export function getCameraState(): CameraState | null {
  const c = cameraRig.controls;
  if (!c) return null;
  const p = c.object.position;
  const t = c.target;
  return { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z };
}

export function applyCameraState(s: CameraState | null | undefined): void {
  const c = cameraRig.controls;
  if (!c || !s) return;
  // OrbitControls has damping enabled by default, which means any drag right
  // before a load leaves residual momentum (sphericalDelta/panOffset) that
  // normally decays gradually across frames. Just setting position/target
  // doesn't clear it, so that leftover momentum kept nudging the camera away
  // from the loaded position for the next second or so — looking like the
  // load hadn't actually restored the view. Toggling damping off for one
  // update() flushes it (the library zeroes both deltas in that path), then
  // we apply the real position on a clean slate.
  const hadDamping = c.enableDamping;
  c.enableDamping = false;
  c.update();
  c.object.position.set(s.px, s.py, s.pz);
  c.target.set(s.tx, s.ty, s.tz);
  c.update();
  c.enableDamping = hadDamping;
}
