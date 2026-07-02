import { useEffect, useRef } from 'react';
import Scene from './three/Scene';
import PoseWheel from './ui/PoseWheel';
import PaintPanel from './ui/PaintPanel';
import StagePanel from './ui/StagePanel';
import ControlsHint from './ui/ControlsHint';
import BrushCursor from './ui/BrushCursor';
import ReferenceCard from './ui/ReferenceCard';
import Gallery from './ui/Gallery';
import SessionsPanel from './ui/SessionsPanel';
import { usePoseStore, POSES } from './store/usePoseStore';
import { usePaintStore } from './store/usePaintStore';
import { useStageStore } from './store/useStageStore';
import './studio.css';

function App() {
  const captureRef = useRef<(() => string | null) | null>(null);
  const paintMode = usePaintStore((s) => s.paintMode);
  const wheelOpen = usePoseStore((s) => s.wheelOpen);
  const lockedPoseId = usePoseStore((s) => s.lockedPoseId);
  const currentLabel = POSES.find((p) => p.id === lockedPoseId)?.label ?? '';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() !== 'f' || e.repeat) return;
      if (usePoseStore.getState().wheelOpen) return;
      usePaintStore.getState().togglePaintMode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Hold Alt to temporarily switch to the eyedropper (quick color pick), and
  // hold Ctrl to temporarily switch to the eraser — like the shortcuts in art
  // tools / the game. Releasing either returns the tool you were using.
  useEffect(() => {
    let prevTool: 'brush' | 'eraser' | 'eyedropper' | null = null;
    let heldKey: 'Alt' | 'Control' | null = null;
    const down = (e: KeyboardEvent) => {
      if (e.repeat || heldKey) return;
      const target: 'eyedropper' | 'eraser' | null =
        e.key === 'Alt' ? 'eyedropper' : e.key === 'Control' ? 'eraser' : null;
      if (!target) return;
      const ps = usePaintStore.getState();
      if (!ps.paintMode || ps.tool === target) return;
      e.preventDefault();
      heldKey = e.key as 'Alt' | 'Control';
      prevTool = ps.tool;
      ps.setTool(target);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== heldKey || prevTool === null) return;
      usePaintStore.getState().setTool(prevTool);
      prevTool = null;
      heldKey = null;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // [ and ] shrink/grow the brush — the standard shortcut in every paint app
  // (Photoshop, Procreate, Krita), so no trip to the size slider is needed.
  useEffect(() => {
    const BRUSH_MIN = 0.02;
    const BRUSH_MAX = 0.35;
    const typing = () => {
      const a = document.activeElement;
      return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '[' && e.key !== ']') return;
      if (typing()) return;
      const ps = usePaintStore.getState();
      if (!ps.paintMode) return;
      e.preventDefault();
      const step = (BRUSH_MAX - BRUSH_MIN) * 0.08;
      const next = ps.brushSize + (e.key === ']' ? step : -step);
      ps.setBrushSize(Math.min(BRUSH_MAX, Math.max(BRUSH_MIN, next)));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // WASD move the character, Z/X move it near/far, Q/E rotate it (turntable).
  // Held keys act continuously.
  useEffect(() => {
    const pressed = new Set<string>();
    const MOVE = new Set(['w', 'a', 's', 'd', 'q', 'e', 'z', 'x']);
    const typing = () => {
      const a = document.activeElement;
      return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
    };
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!MOVE.has(k) || typing()) return;
      pressed.add(k);
    };
    const onUp = (e: KeyboardEvent) => pressed.delete(e.key.toLowerCase());

    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (pressed.size && !usePoseStore.getState().wheelOpen) {
        const s = useStageStore.getState();
        const v = 2.4 * dt;
        // setters clamp to the stage bounds (floor / backdrop)
        if (pressed.has('a')) s.setCharX(s.charX - v);
        if (pressed.has('d')) s.setCharX(s.charX + v);
        if (pressed.has('w')) s.setCharY(s.charY + v);
        if (pressed.has('s')) s.setCharY(s.charY - v);
        if (pressed.has('z')) s.setCharZ(s.charZ - v);
        if (pressed.has('x')) s.setCharZ(s.charZ + v);
        if (pressed.has('q')) s.nudgeRotY(-1.6 * dt);
        if (pressed.has('e')) s.nudgeRotY(1.6 * dt);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return (
    <div className="studio-root">
      <header className="studio-header">
        <div className="studio-brand">
          <span className="studio-brand-kicker">CHAMELEON STUDIO</span>
          <span className="studio-brand-title">
            Chameleon<em>Sol</em>
          </span>
        </div>
        <div className="studio-status-pill">
          {paintMode ? `DRAWING: ${currentLabel.toUpperCase()}` : currentLabel.toUpperCase()}
        </div>
      </header>

      <div className={paintMode ? 'studio-stage studio-stage--painting' : 'studio-stage'}>
        <Scene captureRef={captureRef} />
        <ReferenceCard />
        {!wheelOpen && <StagePanel />}
        {!wheelOpen && <ControlsHint />}
        <PoseWheel />
        <PaintPanel />
        <BrushCursor />
      </div>

      {!wheelOpen && (
        <div className={paintMode ? 'studio-bottom-hint studio-bottom-hint--paint' : 'studio-bottom-hint'}>
          {paintMode ? (
            <>
              Hold <kbd>R</kbd> — Pose Wheel &nbsp;·&nbsp; Press <kbd>F</kbd> — Normal View
            </>
          ) : (
            <>
              Hold <kbd>R</kbd> — Pose Wheel &nbsp;·&nbsp; Press <kbd>F</kbd> — Body Paint
            </>
          )}
        </div>
      )}

      <div className="project-bar">
        <Gallery captureRef={captureRef} />
        <SessionsPanel captureRef={captureRef} />
      </div>
    </div>
  );
}

export default App;
