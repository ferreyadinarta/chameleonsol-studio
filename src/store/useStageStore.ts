import { create } from 'zustand';

// Stage = the reference background + where the character stands and faces.
type StageStore = {
  bgImage: string | null; // data URL of an uploaded reference image
  charX: number; // sideways position (world units)
  charY: number; // up/down position
  charZ: number; // depth position
  charRotY: number; // turntable rotation (radians) — the only axis, like Meccha
  setBgImage: (url: string | null) => void;
  setCharX: (v: number) => void;
  setCharY: (v: number) => void;
  setCharZ: (v: number) => void;
  setCharRotY: (v: number) => void;
  nudgeRotY: (delta: number) => void;
  resetTransform: () => void;
  loadStage: (s: Partial<Pick<StageStore, 'bgImage' | 'charX' | 'charY' | 'charZ' | 'charRotY'>>) => void;
};

export const useStageStore = create<StageStore>((set, get) => ({
  bgImage: null,
  charX: 0,
  charY: 0,
  charZ: 0,
  charRotY: 0,
  setBgImage: (url) => set({ bgImage: url }),
  setCharX: (v) => set({ charX: v }),
  setCharY: (v) => set({ charY: v }),
  setCharZ: (v) => set({ charZ: v }),
  setCharRotY: (v) => set({ charRotY: v }),
  nudgeRotY: (delta) => set({ charRotY: get().charRotY + delta }),
  resetTransform: () => set({ charX: 0, charY: 0, charZ: 0, charRotY: 0 }),
  loadStage: (s) =>
    set({
      bgImage: s.bgImage ?? null,
      charX: s.charX ?? 0,
      charY: s.charY ?? 0,
      charZ: s.charZ ?? 0,
      charRotY: s.charRotY ?? 0,
    }),
}));
