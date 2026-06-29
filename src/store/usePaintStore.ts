import { create } from 'zustand';

export type PaintTool = 'brush' | 'eraser' | 'eyedropper';

const PALETTE_KEY = 'chameleonsol-palette';

function loadPalette(): string[] {
  try {
    const raw = localStorage.getItem(PALETTE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt storage */
  }
  return ['#ffffff', '#2f2f2f', '#8a6d3b', '#3c6e47', '#3b5b8a', '#a13b3b'];
}

type PaintStore = {
  paintMode: boolean;
  tool: PaintTool;
  color: string;
  brushSize: number;
  metalness: number;
  roughness: number;
  palette: string[];
  eyedropperHover: { x: number; y: number; color: string } | null;
  undoSignal: number;
  clearSignal: number;
  saveSignal: number;
  setPaintMode: (on: boolean) => void;
  togglePaintMode: () => void;
  setTool: (tool: PaintTool) => void;
  setColor: (hex: string) => void;
  setBrushSize: (size: number) => void;
  setMetalness: (v: number) => void;
  setRoughness: (v: number) => void;
  addPaletteColor: (hex: string) => void;
  setPalette: (palette: string[]) => void;
  setEyedropperHover: (v: { x: number; y: number; color: string } | null) => void;
  requestUndo: () => void;
  requestClear: () => void;
  requestSave: () => void;
};

export const usePaintStore = create<PaintStore>((set, get) => ({
  paintMode: false,
  tool: 'brush',
  color: '#e8533a',
  brushSize: 0.12,
  metalness: 0.1,
  roughness: 0.7,
  palette: loadPalette(),
  eyedropperHover: null,
  undoSignal: 0,
  clearSignal: 0,
  saveSignal: 0,
  setPaintMode: (on) => set({ paintMode: on }),
  togglePaintMode: () => set({ paintMode: !get().paintMode }),
  setTool: (tool) => set({ tool }),
  setColor: (hex) => set({ color: hex, tool: get().tool === 'eyedropper' ? 'brush' : get().tool, eyedropperHover: null }),
  setEyedropperHover: (v) => set({ eyedropperHover: v }),
  setBrushSize: (size) => set({ brushSize: size }),
  setMetalness: (v) => set({ metalness: v }),
  setRoughness: (v) => set({ roughness: v }),
  addPaletteColor: (hex) => {
    const palette = get().palette;
    if (palette.includes(hex)) return;
    const next = [hex, ...palette].slice(0, 16);
    set({ palette: next });
    localStorage.setItem(PALETTE_KEY, JSON.stringify(next));
  },
  setPalette: (palette) => {
    set({ palette });
    localStorage.setItem(PALETTE_KEY, JSON.stringify(palette));
  },
  requestUndo: () => set({ undoSignal: get().undoSignal + 1 }),
  requestClear: () => set({ clearSignal: get().clearSignal + 1 }),
  requestSave: () => set({ saveSignal: get().saveSignal + 1 }),
}));
