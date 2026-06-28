import { useEffect, useRef } from 'react';
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

  const visible = paintMode && (tool === 'brush' || tool === 'eraser');
  const elRef = useRef<HTMLDivElement>(null);

  // Move the cursor by writing transform directly in a rAF-throttled pointer
  // handler — no React state, so a fast drag never triggers re-renders.
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    let nextX = -100;
    let nextY = -100;
    let seen = false;

    const flush = () => {
      frame = 0;
      const el = elRef.current;
      if (el) {
        if (!seen) {
          el.style.opacity = '1';
          seen = true;
        }
        el.style.transform = `translate(${nextX}px, ${nextY}px) translate(-50%, -50%)`;
      }
    };

    const onMove = (e: PointerEvent) => {
      nextX = e.clientX;
      nextY = e.clientY;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [visible]);

  if (!visible) return null;

  const diameter = sizeToDiameter(brushSize);

  return (
    <div
      ref={elRef}
      className="brush-cursor"
      style={{
        opacity: 0,
        width: diameter,
        height: diameter,
        borderColor: tool === 'eraser' ? '#2c2a26' : color,
        borderStyle: tool === 'eraser' ? 'dashed' : 'solid',
      }}
    />
  );
}
