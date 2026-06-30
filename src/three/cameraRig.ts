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
  c.object.position.set(s.px, s.py, s.pz);
  c.target.set(s.tx, s.ty, s.tz);
  c.update();
}
