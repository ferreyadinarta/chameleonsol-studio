import { useState } from 'react';
import { useStageStore } from '../store/useStageStore';
import UploadModal from './UploadModal';

export default function StagePanel() {
  const bgImage = useStageStore((s) => s.bgImage);
  const charScale = useStageStore((s) => s.charScale);
  const { setBgImage, setCharScale, resetTransform } = useStageStore();
  const [open, setOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="stage-panel">
      <button className="stage-panel-head" onClick={() => setOpen((o) => !o)}>
        <span>STAGE</span>
        <span className="stage-panel-caret">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="stage-panel-body">
          <div className="stage-row stage-row--btns">
            <button className="stage-btn stage-btn--primary" onClick={() => setUploadOpen(true)}>
              {bgImage ? 'Change BG' : 'Upload BG'}
            </button>
            {bgImage && (
              <button className="stage-btn" onClick={() => setBgImage(null)}>
                Remove
              </button>
            )}
          </div>

          <label className="stage-field">
            <span>Character size · {Math.round(charScale * 100)}%</span>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.01}
              value={charScale}
              onChange={(e) => setCharScale(Number(e.target.value))}
            />
          </label>

          <button className="stage-btn stage-btn--full" onClick={resetTransform}>
            Reset position &amp; size
          </button>
        </div>
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
}
