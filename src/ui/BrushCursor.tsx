import { useEffect, useRef, useState } from 'react';
import { usePaintStore } from '../store/usePaintStore';

const MIN_PX = 10;
const MAX_PX = 160;
const MIN_SIZE = 0.02;
const MAX_SIZE = 0.35;

function sizeToDiameter(brushSize: number): number {
  const t = (brushSize - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
  return MIN_PX + Math.min(1, Math.max(0, t)) * (MAX_PX - MIN_PX);
}

export default function BrushCursor() {
  const paintMode = usePaintStore((s) => s.paintMode);
  const tool = usePaintStore((s) => s.tool);
  const brushSize = usePaintStore((s) => s.brushSize);
  const color = usePaintStore((s) => s.color);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const visible = paintMode && (tool === 'brush' || tool === 'eraser');
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!visibleRef.current) return;
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  if (!visible || !pos) return null;

  const diameter = sizeToDiameter(brushSize);

  return (
    <div
      className="brush-cursor"
      style={{
        left: pos.x,
        top: pos.y,
        width: diameter,
        height: diameter,
        borderColor: tool === 'eraser' ? '#2c2a26' : color,
        borderStyle: tool === 'eraser' ? 'dashed' : 'solid',
      }}
    />
  );
}
