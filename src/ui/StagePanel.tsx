import { useRef, useState } from 'react';
import { useStageStore } from '../store/useStageStore';
import { STOCK_BACKGROUNDS } from '../utils/stockBackgrounds';
import { snapshotCharacter, pushCharacterUndo, type CharacterSnapshot } from '../utils/undoStack';
import UploadModal from './UploadModal';

export default function StagePanel() {
  const bgImage = useStageStore((s) => s.bgImage);
  const charScale = useStageStore((s) => s.charScale);
  const { setBgImage, setCharScale, resetTransform } = useStageStore();
  const [open, setOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const activeStock = STOCK_BACKGROUNDS.find((s) => s.url === bgImage)?.id ?? null;
  const sliderPrevRef = useRef<CharacterSnapshot | null>(null);

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

          <div className="stage-field">
            <span>Stock backgrounds</span>
            <div className="stock-scene-row">
              {STOCK_BACKGROUNDS.map((s) => (
                <button
                  key={s.id}
                  className={activeStock === s.id ? 'stock-scene-swatch stock-scene-swatch--active' : 'stock-scene-swatch'}
                  style={{ background: s.swatch }}
                  title={s.label}
                  onClick={() => setBgImage(activeStock === s.id ? null : s.url)}
                />
              ))}
            </div>
          </div>

          <label className="stage-field">
            <span>Character size · {Math.round(charScale * 100)}%</span>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.01}
              value={charScale}
              onPointerDown={() => {
                sliderPrevRef.current = snapshotCharacter();
              }}
              onChange={(e) => setCharScale(Number(e.target.value))}
              onPointerUp={() => {
                if (sliderPrevRef.current) pushCharacterUndo(sliderPrevRef.current);
                sliderPrevRef.current = null;
              }}
            />
          </label>

          <button
            className="stage-btn stage-btn--full"
            onClick={() => {
              const prev = snapshotCharacter();
              resetTransform();
              pushCharacterUndo(prev);
            }}
          >
            Reset position &amp; size
          </button>
        </div>
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
}
