import { useEffect, useRef, useState } from 'react';
import { usePaintStore } from '../store/usePaintStore';

const GALLERY_KEY = 'chameleonsol-gallery';

function loadGallery(): string[] {
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt storage */
  }
  return [];
}

type Props = {
  captureRef: { current: (() => string | null) | null };
};

export default function Gallery({ captureRef }: Props) {
  const [shots, setShots] = useState<string[]>(loadGallery);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(shots));
  }, [shots]);

  const handleSave = () => {
    const dataUrl = captureRef.current?.();
    if (!dataUrl) return;
    setShots((prev) => [dataUrl, ...prev].slice(0, 24));
    setOpen(true);
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(
    () =>
      usePaintStore.subscribe((state, prev) => {
        if (state.saveSignal === prev.saveSignal) return;
        handleSaveRef.current();
      }),
    [],
  );

  const handleDownload = (dataUrl: string, index: number) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `chameleonsol-pfp-${index + 1}.png`;
    a.click();
  };

  const handleRemove = (index: number) => {
    setShots((prev) => prev.filter((_, i) => i !== index));
    setPreview(null);
  };

  return (
    <div className="gallery">
      <div className="gallery-actions">
        <button className="save-pfp-btn" onClick={handleSave}>
          Save as PFP
        </button>
        <button className="gallery-toggle-btn" onClick={() => setOpen((o) => !o)}>
          Gallery ({shots.length})
        </button>
      </div>
      {open &&
        (shots.length === 0 ? (
          <div className="gallery-grid">
            <div className="gallery-empty">No saved PFPs yet.</div>
          </div>
        ) : (
          <div className="gallery-grid">
            {shots.map((shot, i) => (
              <div className="gallery-item" key={i}>
                <img src={shot} alt={`PFP ${i + 1}`} onClick={() => setPreview(i)} />
                <button className="gallery-item-remove" onClick={() => handleRemove(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}

      {preview !== null && shots[preview] && (
        <div className="pfp-modal-overlay" onClick={() => setPreview(null)}>
          <div className="pfp-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pfp-modal-close" onClick={() => setPreview(null)}>
              ×
            </button>
            <img src={shots[preview]} alt={`PFP ${preview + 1}`} />
            <div className="pfp-modal-actions">
              <button className="save-pfp-btn" onClick={() => handleDownload(shots[preview], preview)}>
                Download
              </button>
              <button className="gallery-toggle-btn" onClick={() => handleRemove(preview)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
