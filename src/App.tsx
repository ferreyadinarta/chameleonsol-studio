import { useEffect, useRef } from 'react';
import Scene from './three/Scene';
import PoseWheel from './ui/PoseWheel';
import PaintPanel from './ui/PaintPanel';
import BrushCursor from './ui/BrushCursor';
import ReferenceCard from './ui/ReferenceCard';
import Gallery from './ui/Gallery';
import { usePoseStore, POSES } from './store/usePoseStore';
import { usePaintStore } from './store/usePaintStore';
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

  return (
    <div className="studio-root">
      <header className="studio-header">
        <div className="studio-brand">
          <span className="studio-brand-kicker">CHAMELEON STUDIO</span>
          <span className="studio-brand-title">
            Chameleon<em>Sol</em>
          </span>
        </div>
        <div className="studio-status-pill">{paintMode ? 'BODY PAINT' : currentLabel.toUpperCase()}</div>
      </header>

      <div className={paintMode ? 'studio-stage studio-stage--painting' : 'studio-stage'}>
        <Scene captureRef={captureRef} />
        <ReferenceCard />
        <PoseWheel />
        <PaintPanel />
        <BrushCursor />
      </div>

      {!wheelOpen && !paintMode && (
        <div className="studio-bottom-hint">
          Hold <kbd>R</kbd> — Pose Wheel &nbsp;·&nbsp; Hold <kbd>F</kbd> — Body Paint
        </div>
      )}

      <Gallery captureRef={captureRef} />
    </div>
  );
}

export default App;
