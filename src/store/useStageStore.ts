import { create } from 'zustand';

// Stage = the reference background + where the character stands and faces.
type StageStore = {
  bgImage: string | null; // data URL of the reference photo/painting (uploaded or a stock pick)
  charX: number; // sideways position (world units)
  charY: number; // up/down position
  charZ: number; // depth position
  charRotY: number; // turntable rotation (radians) — the only axis, like Meccha
  charScale: number; // character size multiplier
  setBgImage: (url: string | null) => void;
  setCharX: (v: number) => void;
  setCharY: (v: number) => void;
  setCharZ: (v: number) => void;
  setCharRotY: (v: number) => void;
  setCharScale: (v: number) => void;
  nudgeRotY: (delta: number) => void;
  resetTransform: () => void;
  loadStage: (
    s: Partial<Pick<StageStore, 'bgImage' | 'charX' | 'charY' | 'charZ' | 'charRotY' | 'charScale'>>,
  ) => void;
};

// Movement limits so the character can't slide through the floor or behind the
// backdrop. With the default 3D walls the box hugs the room (in front of the
// back wall at z = -1.4, feet on the floor at y = 0). With a backdrop image
// the limits relax since PhotoBoard sits further back.
const BACK_WALL_Z = -1.4; // matches the CamoSurface back wall in Scene
const BACK_HALF_DEPTH = 0.19; // character's back extent at scale 1 (measured)

const BOUNDS = {
  walls: { x: [-2.6, 2.6], y: [0, 2.6] },
  backdrop: { x: [-4.5, 4.5], y: [-3.5, 4] },
};
const cl = (v: number, [lo, hi]: number[]) => Math.min(hi, Math.max(lo, v));
const xy = (bg: string | null) => (bg ? BOUNDS.backdrop : BOUNDS.walls);

// Depth limits: with walls, the back sits flush against the wall (scale-aware)
// and can't come past the camera; with a backdrop, looser.
const zBound = (bg: string | null, scale: number): [number, number] =>
  bg ? [-4.5, 3] : [BACK_WALL_Z + BACK_HALF_DEPTH * scale, 2.8];

export const useStageStore = create<StageStore>((set, get) => ({
  bgImage: null,
  charX: 0,
  charY: 0,
  charZ: 0,
  charRotY: 0,
  charScale: 1,
  setBgImage: (url) => {
    const b = xy(url);
    set((s) => ({
      bgImage: url,
      charX: cl(s.charX, b.x),
      charY: cl(s.charY, b.y),
      charZ: cl(s.charZ, zBound(url, s.charScale)),
    }));
  },
  setCharX: (v) => set((s) => ({ charX: cl(v, xy(s.bgImage).x) })),
  setCharY: (v) => set((s) => ({ charY: cl(v, xy(s.bgImage).y) })),
  setCharZ: (v) => set((s) => ({ charZ: cl(v, zBound(s.bgImage, s.charScale)) })),
  setCharRotY: (v) => set({ charRotY: v }),
  setCharScale: (v) => set((s) => ({ charScale: v, charZ: cl(s.charZ, zBound(s.bgImage, v)) })),
  nudgeRotY: (delta) => set({ charRotY: get().charRotY + delta }),
  resetTransform: () => set({ charX: 0, charY: 0, charZ: 0, charRotY: 0, charScale: 1 }),
  loadStage: (s) => {
    const bg = s.bgImage ?? null;
    const b = xy(bg);
    const scale = s.charScale ?? 1;
    set({
      bgImage: bg,
      charX: cl(s.charX ?? 0, b.x),
      charY: cl(s.charY ?? 0, b.y),
      charZ: cl(s.charZ ?? 0, zBound(bg, scale)),
      charRotY: s.charRotY ?? 0,
      charScale: scale,
    });
  },
}));
