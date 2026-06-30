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
function EyedropperCursor() {
  const hover = usePaintStore((s) => s.eyedropperHover);
  if (!hover) return null;
  return (
    <div className="eyedropper-cursor" style={{ left: hover.x, top: hover.y }}>
      <div className="eyedropper-cursor-swatch" style={{ background: hover.color }} />
      <span className="eyedropper-cursor-hex">{hover.color.toUpperCase()}</span>
    </div>
  );
}
