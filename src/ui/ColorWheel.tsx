import { useEffect, useRef } from 'react';
import type { HSV } from '../utils/color';

const SIZE = 160;
const RADIUS = SIZE / 2;

type Props = {
  hsv: HSV;
  onPick: (h: number, s: number) => void;
};

export default function ColorWheel({ hsv, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(RADIUS, RADIUS, RADIUS - 1, 0, Math.PI * 2);
    ctx.clip();

    const conic = (ctx as CanvasRenderingContext2D & {
      createConicGradient?: (a: number, x: number, y: number) => CanvasGradient;
    }).createConicGradient?.(-Math.PI / 2, RADIUS, RADIUS);
    if (conic) {
      for (let i = 0; i <= 360; i += 30) {
        conic.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
      }
      ctx.fillStyle = conic;
    } else {
      ctx.fillStyle = '#ff0000';
    }
    ctx.fillRect(0, 0, SIZE, SIZE);

    const radial = ctx.createRadialGradient(RADIUS, RADIUS, 0, RADIUS, RADIUS, RADIUS);
    radial.addColorStop(0, 'rgba(255,255,255,1)');
    radial.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.restore();
  }, []);

  const pickFromEvent = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = clientX - (rect.left + RADIUS);
    const dy = clientY - (rect.top + RADIUS);
    const dist = Math.min(RADIUS, Math.sqrt(dx * dx + dy * dy));
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    angle = (angle + 360) % 360;
    const s = dist / RADIUS;
    onPick(angle, s);
  };

  const indicatorAngleRad = (hsv.h * Math.PI) / 180;
  const indicatorR = hsv.s * RADIUS;
  const ix = RADIUS + indicatorR * Math.cos(indicatorAngleRad);
  const iy = RADIUS + indicatorR * Math.sin(indicatorAngleRad);

  return (
    <div
      className="color-wheel"
      style={{ width: SIZE, height: SIZE }}
      onPointerDown={(e) => {
        draggingRef.current = true;
        pickFromEvent(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) pickFromEvent(e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerLeave={() => {
        draggingRef.current = false;
      }}
    >
      <canvas ref={canvasRef} width={SIZE} height={SIZE} />
      <div className="color-wheel-indicator" style={{ left: ix, top: iy }} />
    </div>
  );
}
