import { create } from 'zustand';
import { POSES, POSE_WHEEL_ORDER, type Pose } from '../data/poses';

type PoseStore = {
  lockedPoseId: string;
  hoveredPoseId: string | null;
  glideAmount: number;
  wheelOpen: boolean;
  openWheel: () => void;
  setLockedPose: (id: string) => void;
  setHover: (poseId: string | null, amount: number) => void;
  lockHovered: () => void;
  closeWheel: () => void;
  getPose: (id: string) => Pose;
};

export const usePoseStore = create<PoseStore>((set, get) => ({
  lockedPoseId: 'standing',
  hoveredPoseId: null,
  glideAmount: 0,
  wheelOpen: false,
  openWheel: () => set({ wheelOpen: true, hoveredPoseId: null, glideAmount: 0 }),
  setLockedPose: (id) => set({ lockedPoseId: id, hoveredPoseId: null, glideAmount: 0 }),
  setHover: (poseId, amount) => set({ hoveredPoseId: poseId, glideAmount: amount }),
  lockHovered: () => {
    const { hoveredPoseId, lockedPoseId } = get();
    set({
      lockedPoseId: hoveredPoseId ?? lockedPoseId,
      wheelOpen: false,
      hoveredPoseId: null,
      glideAmount: 0,
    });
  },
  closeWheel: () => set({ wheelOpen: false, hoveredPoseId: null, glideAmount: 0 }),
  getPose: (id) => POSES.find((p) => p.id === id) ?? POSES[0],
}));

export { POSES, POSE_WHEEL_ORDER };
