import { useEffect, useState } from 'react';

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

  useEffect(() => {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(shots));
  }, [shots]);

  const handleSave = () => {
    const dataUrl = captureRef.current?.();
    if (!dataUrl) return;
    setShots((prev) => [dataUrl, ...prev].slice(0, 24));
  };

  const handleDownload = (dataUrl: string, index: number) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `chameleonsol-pfp-${index + 1}.png`;
    a.click();
  };

  const handleRemove = (index: number) => {
    setShots((prev) => prev.filter((_, i) => i !== index));
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
      {open && (
        <div className="gallery-grid">
          {shots.length === 0 && <div className="gallery-empty">No saved PFPs yet.</div>}
          {shots.map((shot, i) => (
            <div className="gallery-item" key={i}>
              <img src={shot} alt={`PFP ${i + 1}`} onClick={() => handleDownload(shot, i)} />
              <button className="gallery-item-remove" onClick={() => handleRemove(i)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
