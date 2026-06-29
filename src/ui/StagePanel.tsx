import { useRef, useState } from 'react';
import { useStageStore } from '../store/useStageStore';

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

export default function StagePanel() {
  const bgImage = useStageStore((s) => s.bgImage);
  const charX = useStageStore((s) => s.charX);
  const charY = useStageStore((s) => s.charY);
  const charZ = useStageStore((s) => s.charZ);
  const charRotY = useStageStore((s) => s.charRotY);
  const { setBgImage, setCharX, setCharY, setCharZ, setCharRotY, resetTransform } = useStageStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(true);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="stage-panel">
      <button className="stage-panel-head" onClick={() => setOpen((o) => !o)}>
        <span>STAGE</span>
        <span className="stage-panel-caret">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="stage-panel-body">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
          <div className="stage-row stage-row--btns">
            <button className="stage-btn stage-btn--primary" onClick={() => fileRef.current?.click()}>
              {bgImage ? 'Change BG' : 'Upload BG'}
            </button>
            {bgImage && (
              <button className="stage-btn" onClick={() => setBgImage(null)}>
                Remove
              </button>
            )}
          </div>

          <label className="stage-field">
            <span>Rotate</span>
            <input
              type="range"
              min={-180}
              max={180}
              value={Math.round(charRotY * R2D)}
              onChange={(e) => setCharRotY(Number(e.target.value) * D2R)}
            />
          </label>
          <label className="stage-field">
            <span>Left / Right</span>
            <input
              type="range"
              min={-1.6}
              max={1.6}
              step={0.02}
              value={charX}
              onChange={(e) => setCharX(Number(e.target.value))}
            />
          </label>
          <label className="stage-field">
            <span>Up / Down</span>
            <input
              type="range"
              min={-1.2}
              max={1.6}
              step={0.02}
              value={charY}
              onChange={(e) => setCharY(Number(e.target.value))}
            />
          </label>
          <label className="stage-field">
            <span>Near / Far</span>
            <input
              type="range"
              min={-1.6}
              max={1.6}
              step={0.02}
              value={charZ}
              onChange={(e) => setCharZ(Number(e.target.value))}
            />
          </label>

          <button className="stage-btn stage-btn--full" onClick={resetTransform}>
            Reset position
          </button>
        </div>
      )}
    </div>
  );
}
