import * as THREE from 'three';

// Bone roles for free_pack_-_stick_man_rigged.glb (Mixamo-style humanoid,
// T-pose bind). Left = model +X, Right = -X. Arms rest along ±X.
export const BONES = {
  spine: 'Spine_01',
  chest: 'Spine2_03',
  head: 'Head_05',
  lShoulder: 'LeftArm_08',
  lElbow: 'LeftForeArm_09',
  rShoulder: 'RightArm_012',
  rElbow: 'RightForeArm_013',
  lHip: 'LeftUpLeg_015',
  lKnee: 'LeftLeg_016',
  rHip: 'RightUpLeg_018',
  rKnee: 'RightLeg_019',
} as const;

// A pose is a set of world-axis rotations applied on top of the T-pose bind,
// plus an optional whole-body group transform (used to lay the figure down).
export type AxisRot = [bone: string, axis: 'x' | 'y' | 'z', deg: number];
export type GlbPose = {
  bones: AxisRot[];
  groupRot?: [number, number, number]; // radians
  groupPos?: [number, number, number];
};

const D = (deg: number) => (deg * Math.PI) / 180;

// Arms rest along ±X in bind. Rotating a shoulder around world Z swings the
// arm in the front plane: left arm down = -Z, right arm down = +Z.
export const GLB_POSES: Record<string, GlbPose> = {
  standing: {
    bones: [
      [BONES.lShoulder, 'z', -80],
      [BONES.rShoulder, 'z', 80],
      [BONES.lShoulder, 'x', 4],
      [BONES.rShoulder, 'x', 4],
    ],
  },
  'at-ease': {
    bones: [
      [BONES.lShoulder, 'z', -72],
      [BONES.rShoulder, 'z', 72],
      [BONES.lShoulder, 'x', 12],
      [BONES.rShoulder, 'x', 12],
      [BONES.lElbow, 'y', 20],
      [BONES.rElbow, 'y', -20],
      [BONES.head, 'x', 5],
    ],
  },
  crouching: {
    bones: [
      [BONES.spine, 'x', 24],
      [BONES.head, 'x', -12],
      [BONES.lShoulder, 'z', -58],
      [BONES.rShoulder, 'z', 58],
      [BONES.lShoulder, 'x', 30],
      [BONES.rShoulder, 'x', 30],
      [BONES.lHip, 'x', 58],
      [BONES.rHip, 'x', 58],
      [BONES.lKnee, 'x', -78],
      [BONES.rKnee, 'x', -78],
    ],
    groupPos: [0, -0.32, 0],
  },
  'star-jump': {
    bones: [
      [BONES.lShoulder, 'z', 45],
      [BONES.rShoulder, 'z', -45],
      [BONES.lHip, 'z', 22],
      [BONES.rHip, 'z', -22],
    ],
  },
  blastoff: {
    bones: [
      [BONES.lShoulder, 'z', 100],
      [BONES.rShoulder, 'z', -100],
      [BONES.head, 'x', -8],
    ],
  },
  cheering: {
    bones: [
      [BONES.lShoulder, 'z', 120],
      [BONES.rShoulder, 'z', -120],
      [BONES.head, 'x', -6],
    ],
  },
  resting: {
    // lying on the back
    bones: [
      [BONES.lShoulder, 'z', -55],
      [BONES.rShoulder, 'z', 55],
      [BONES.head, 'x', 10],
    ],
    groupRot: [-Math.PI / 2, 0, 0],
    groupPos: [0, 0.3, 0.0],
  },
  'curled-up': {
    bones: [
      [BONES.spine, 'x', 45],
      [BONES.head, 'x', 35],
      [BONES.lShoulder, 'z', -38],
      [BONES.rShoulder, 'z', 38],
      [BONES.lShoulder, 'x', 65],
      [BONES.rShoulder, 'x', 65],
      [BONES.lHip, 'x', 90],
      [BONES.rHip, 'x', 90],
      [BONES.lKnee, 'x', -95],
      [BONES.rKnee, 'x', -95],
    ],
    groupRot: [-Math.PI / 2, 0, 0],
    groupPos: [0, 0.4, 0.15],
  },
};

const _pq = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _dq = new THREE.Quaternion();
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

// Rotate a bone about a WORLD axis at its joint, on top of its current local
// orientation. Predictable axes (world X/Y/Z) instead of guessing bone-local
// frames. Parent world matrices must be current before calling.
function rotateWorldAxis(bone: THREE.Bone, axis: 'x' | 'y' | 'z', deg: number) {
  if (!bone.parent) return;
  bone.parent.getWorldQuaternion(_pq);
  _axis.copy(AXES[axis]).applyQuaternion(_pq.invert()).normalize();
  _dq.setFromAxisAngle(_axis, D(deg));
  bone.quaternion.premultiply(_dq);
}

// Build the target LOCAL quaternion for every bone in a pose, starting from
// the captured bind quaternions. Returns name -> quaternion.
export function buildPoseQuaternions(
  bones: Record<string, THREE.Bone>,
  bind: Record<string, THREE.Quaternion>,
  root: THREE.Object3D,
  pose: GlbPose,
): Record<string, THREE.Quaternion> {
  for (const name in bones) bones[name].quaternion.copy(bind[name]);
  root.updateMatrixWorld(true);

  for (const [name, axis, deg] of pose.bones) {
    const bone = bones[name];
    if (!bone) continue;
    rotateWorldAxis(bone, axis, deg);
    root.updateMatrixWorld(true);
  }

  const out: Record<string, THREE.Quaternion> = {};
  for (const name in bones) out[name] = bones[name].quaternion.clone();

  for (const name in bones) bones[name].quaternion.copy(bind[name]);
  root.updateMatrixWorld(true);
  return out;
}
