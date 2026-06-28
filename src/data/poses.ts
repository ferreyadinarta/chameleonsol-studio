export type Vec3 = [number, number, number];

export type PoseJoints = {
  root: { rotation: Vec3; position: Vec3 };
  torso: { rotation: Vec3 };
  head: { rotation: Vec3 };
  leftArm: { rotation: Vec3 };
  rightArm: { rotation: Vec3 };
  leftLeg: { rotation: Vec3 };
  rightLeg: { rotation: Vec3 };
};

export type Pose = {
  id: string;
  label: string;
  joints: PoseJoints;
};

const deg = (d: number) => (d * Math.PI) / 180;

// Lifts the rig so feet rest at world y = 0 (see Character.tsx limb offsets).
export const GROUND_LIFT = 0.97;

const base: PoseJoints = {
  root: { rotation: [0, 0, 0], position: [0, GROUND_LIFT, 0] },
  torso: { rotation: [0, 0, 0] },
  head: { rotation: [0, 0, 0] },
  leftArm: { rotation: [0, 0, 0] },
  rightArm: { rotation: [0, 0, 0] },
  leftLeg: { rotation: [0, 0, 0] },
  rightLeg: { rotation: [0, 0, 0] },
};

export const POSES: Pose[] = [
  {
    id: 'standing',
    label: 'Standing',
    joints: { ...base, leftArm: { rotation: [0, 0, deg(4)] }, rightArm: { rotation: [0, 0, deg(-4)] } },
  },
  {
    id: 'at-ease',
    label: 'At Ease',
    joints: {
      ...base,
      leftArm: { rotation: [deg(8), 0, deg(10)] },
      rightArm: { rotation: [deg(8), 0, deg(-10)] },
      head: { rotation: [deg(4), 0, 0] },
    },
  },
  {
    id: 'crouching',
    label: 'Crouching',
    joints: {
      ...base,
      root: { rotation: [0, 0, 0], position: [0, GROUND_LIFT - 0.32, 0] },
      torso: { rotation: [deg(28), 0, 0] },
      head: { rotation: [deg(-10), 0, 0] },
      leftArm: { rotation: [deg(40), 0, deg(20)] },
      rightArm: { rotation: [deg(40), 0, deg(-20)] },
      leftLeg: { rotation: [deg(70), 0, deg(8)] },
      rightLeg: { rotation: [deg(70), 0, deg(-8)] },
    },
  },
  {
    id: 'star-jump',
    label: 'Star Jump',
    joints: {
      ...base,
      leftArm: { rotation: [0, 0, deg(70)] },
      rightArm: { rotation: [0, 0, deg(-70)] },
      leftLeg: { rotation: [0, 0, deg(-35)] },
      rightLeg: { rotation: [0, 0, deg(35)] },
    },
  },
  {
    id: 'blastoff',
    label: 'Blastoff',
    joints: {
      ...base,
      head: { rotation: [deg(-8), 0, 0] },
      leftArm: { rotation: [deg(-175), 0, deg(12)] },
      rightArm: { rotation: [deg(-175), 0, deg(-12)] },
      leftLeg: { rotation: [0, 0, deg(-6)] },
      rightLeg: { rotation: [0, 0, deg(6)] },
    },
  },
  {
    id: 'cheering',
    label: 'Cheering',
    joints: {
      ...base,
      head: { rotation: [deg(-6), 0, 0] },
      leftArm: { rotation: [deg(-150), 0, deg(35)] },
      rightArm: { rotation: [deg(-150), 0, deg(-35)] },
    },
  },
  {
    id: 'resting',
    label: 'Resting',
    joints: {
      ...base,
      root: { rotation: [deg(-90), 0, 0], position: [0, 0.32, 0.4] },
      torso: { rotation: [0, 0, 0] },
      head: { rotation: [deg(10), 0, 0] },
      leftArm: { rotation: [deg(10), 0, deg(75)] },
      rightArm: { rotation: [deg(10), 0, deg(-75)] },
      leftLeg: { rotation: [deg(-4), 0, deg(6)] },
      rightLeg: { rotation: [deg(-4), 0, deg(-6)] },
    },
  },
  {
    id: 'curled-up',
    label: 'Curled Up',
    joints: {
      ...base,
      root: { rotation: [deg(-90), 0, 0], position: [0, 0.34, 0.55] },
      torso: { rotation: [deg(50), 0, 0] },
      head: { rotation: [deg(40), 0, 0] },
      leftArm: { rotation: [deg(110), 0, deg(30)] },
      rightArm: { rotation: [deg(110), 0, deg(-30)] },
      leftLeg: { rotation: [deg(130), 0, deg(10)] },
      rightLeg: { rotation: [deg(130), 0, deg(-10)] },
    },
  },
];

export const POSE_WHEEL_ORDER = [
  'standing',
  'at-ease',
  'blastoff',
  'star-jump',
  'cheering',
  'resting',
  'curled-up',
  'crouching',
];
