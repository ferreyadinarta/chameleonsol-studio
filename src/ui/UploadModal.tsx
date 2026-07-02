import { useRef, useState } from 'react';
import { useStageStore } from '../store/useStageStore';

type Picked = {
  dataUrl: string;
  name: string;
  type: string;
  bytes: number;
  width: number;
  height: number;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadModal({ onClose }: { onClose: () => void }) {
  const setBgImage = useStageStore((s) => s.setBgImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);

  const ingest = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image.');
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setPicked({
          dataUrl,
          name: file.name,
          type: file.type,
          bytes: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        setReading(false);
      };
      img.onerror = () => {
        setError('Could not read that image.');
        setReading(false);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setError('Could not read that file.');
      setReading(false);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) ingest(file);
  };

  const apply = () => {
    if (!picked) return;
    setBgImage(picked.dataUrl);
    onClose();
  };

  return (
    <div className="pfp-modal-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sessions-modal-head">
          <span>BACKGROUND IMAGE</span>
          <button className="pfp-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) ingest(f);
            e.target.value = '';
          }}
        />

        <div
          className={dragging ? 'upload-drop upload-drop--over' : 'upload-drop'}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {reading ? (
            <>
              <span className="spinner" />
              <p className="upload-drop-title">Reading image…</p>
            </>
          ) : picked ? (
            <img className="upload-preview" src={picked.dataUrl} alt="" />
          ) : (
            <>
              <div className="upload-drop-icon">⬆</div>
              <p className="upload-drop-title">Drag &amp; drop an image</p>
              <p className="upload-drop-sub">or click to browse · PNG, JPG, WebP, GIF</p>
            </>
          )}
        </div>

        {error && <p className="upload-error">{error}</p>}

        {picked && (
          <div className="upload-info">
            <div>
              <span>Name</span>
              <strong title={picked.name}>{picked.name}</strong>
            </div>
            <div>
              <span>Dimensions</span>
              <strong>
                {picked.width} × {picked.height}px
              </strong>
            </div>
            <div>
              <span>Size</span>
              <strong>{formatBytes(picked.bytes)}</strong>
            </div>
            <div>
              <span>Type</span>
              <strong>{picked.type || '—'}</strong>
            </div>
          </div>
        )}

        <div className="upload-actions">
          <button className="stage-btn" onClick={() => fileRef.current?.click()}>
            {picked ? 'Choose another' : 'Browse files'}
          </button>
          <button className="stage-btn stage-btn--primary" disabled={!picked} onClick={apply}>
            Use as background
          </button>
        </div>
      </div>
    </div>
  );
}
