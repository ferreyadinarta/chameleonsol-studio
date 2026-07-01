import { usePaintStore } from '../store/usePaintStore';

// The brush/eraser cursor is drawn in 3D (BrushDecal) so it tilts to the
// surface. This component only handles the eyedropper's color preview.
export default function BrushCursor() {
  const paintMode = usePaintStore((s) => s.paintMode);
  const tool = usePaintStore((s) => s.tool);
  if (paintMode && tool === 'eyedropper') return <EyedropperCursor />;
  return null;
}

// Live color preview that follows the cursor while the eyedropper is active.
// A precise crosshair sits exactly on the sampled pixel (dark+white double
// stroke so it reads on any color); the swatch/hex pill floats beside it so
// it never covers the point being sampled.
function EyedropperCursor() {
  const hover = usePaintStore((s) => s.eyedropperHover);
  if (!hover) return null;
  return (
    <div className="eyedropper-cursor" style={{ left: hover.x, top: hover.y }}>
      <svg className="eyedropper-crosshair" width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <g stroke="#181613" strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
          <line x1="13" y1="1" x2="13" y2="9" />
          <line x1="13" y1="17" x2="13" y2="25" />
          <line x1="1" y1="13" x2="9" y2="13" />
          <line x1="17" y1="13" x2="25" y2="13" />
          <circle cx="13" cy="13" r="5.5" fill="none" />
        </g>
        <g stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round">
          <line x1="13" y1="1" x2="13" y2="9" />
          <line x1="13" y1="17" x2="13" y2="25" />
          <line x1="1" y1="13" x2="9" y2="13" />
          <line x1="17" y1="13" x2="25" y2="13" />
          <circle cx="13" cy="13" r="5.5" fill="none" />
        </g>
      </svg>
      <div className="eyedropper-cursor-pill">
        <div className="eyedropper-cursor-swatch" style={{ background: hover.color }} />
        <span className="eyedropper-cursor-hex">{hover.color.toUpperCase()}</span>
      </div>
    </div>
  );
}
