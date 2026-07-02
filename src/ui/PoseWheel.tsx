import { useEffect, useRef } from 'react';
import { usePoseStore, POSES, POSE_WHEEL_ORDER } from '../store/usePoseStore';
import { snapshotCharacter, pushCharacterUndo } from '../utils/undoStack';
import PoseIcon from './PoseIcon';

const SIZE = 440;
const CENTER = SIZE / 2;
const OUTER_R = 200;
const INNER_R = 78;
const SLICE_DEG = 360 / POSE_WHEEL_ORDER.length;

function polar(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)];
}

function wedgePath(index: number): string {
  const centerAngle = -90 + index * SLICE_DEG;
  const start = centerAngle - SLICE_DEG / 2;
  const end = centerAngle + SLICE_DEG / 2;
  const [ox1, oy1] = polar(start, OUTER_R);
  const [ox2, oy2] = polar(end, OUTER_R);
  const [ix2, iy2] = polar(end, INNER_R);
  const [ix1, iy1] = polar(start, INNER_R);
  return `M ${ox1} ${oy1} A ${OUTER_R} ${OUTER_R} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${INNER_R} ${INNER_R} 0 0 0 ${ix1} ${iy1} Z`;
}

function labelPos(index: number): [number, number] {
  const centerAngle = -90 + index * SLICE_DEG;
  return polar(centerAngle, (OUTER_R + INNER_R) / 2 + 28);
}

function iconPos(index: number): [number, number] {
  const centerAngle = -90 + index * SLICE_DEG;
  return polar(centerAngle, (OUTER_R + INNER_R) / 2 - 6);
}

const SPOKE_ANGLES = [18, 65, 132, 178, 221, 289];

export default function PoseWheel() {
  const wheelOpen = usePoseStore((s) => s.wheelOpen);
  const hoveredPoseId = usePoseStore((s) => s.hoveredPoseId);
  const lockedPoseId = usePoseStore((s) => s.lockedPoseId);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'r') return;
      if (!usePoseStore.getState().wheelOpen) usePoseStore.getState().openWheel();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'r') return;
      if (usePoseStore.getState().wheelOpen) {
        const prev = snapshotCharacter();
        usePoseStore.getState().lockHovered();
        pushCharacterUndo(prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!wheelOpen) return;

    const update = (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      angleDeg = (angleDeg + 90 + 360) % 360;
      const index = Math.round(angleDeg / SLICE_DEG) % POSE_WHEEL_ORDER.length;
      const poseId = POSE_WHEEL_ORDER[index];
      const radiusPx = (dist / SIZE) * 2 * OUTER_R;
      const amount = Math.min(1, Math.max(0, (radiusPx - INNER_R * 0.3) / (OUTER_R - INNER_R * 0.3)));
      usePoseStore.getState().setHover(poseId, amount);
    };

    const onPointerMove = (e: PointerEvent) => update(e.clientX, e.clientY);
    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [wheelOpen]);

  if (!wheelOpen) return null;

  const currentLabel = POSES.find((p) => p.id === (hoveredPoseId ?? lockedPoseId))?.label ?? '';

  return (
    <div className="pose-wheel-overlay">
      <div className="pose-wheel" ref={containerRef}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {POSE_WHEEL_ORDER.map((poseId, i) => {
            const pose = POSES.find((p) => p.id === poseId)!;
            const isHovered = hoveredPoseId === poseId;
            const [lx, ly] = labelPos(i);
            const [ix, iy] = iconPos(i);
            return (
              <g key={poseId}>
                <path
                  d={wedgePath(i)}
                  className={isHovered ? 'pose-wedge pose-wedge--active' : 'pose-wedge'}
                />
                <circle cx={ix} cy={iy} r={22} className={isHovered ? 'pose-wedge-badge pose-wedge-badge--active' : 'pose-wedge-badge'} />
                <foreignObject x={ix - 16} y={iy - 16} width={32} height={32}>
                  <PoseIcon joints={pose.joints} size={32} active={isHovered} />
                </foreignObject>
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={isHovered ? 'pose-wedge-label pose-wedge-label--active' : 'pose-wedge-label'}
                >
                  {pose.label.toUpperCase()}
                </text>
              </g>
            );
          })}
          <g className="pose-wheel-spokes">
            {SPOKE_ANGLES.map((a) => {
              const [x1, y1] = polar(a, INNER_R - 8);
              const [x2, y2] = polar(a + 180, INNER_R - 8);
              return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
        </svg>
        <div className="pose-wheel-center">
          <div className="pose-wheel-center-title">POSE WHEEL</div>
          <div className="pose-wheel-center-current">{currentLabel}</div>
        </div>
      </div>
      <div className="pose-wheel-hint">Glide toward a pose — release R (or your finger) to lock it.</div>
    </div>
  );
}
