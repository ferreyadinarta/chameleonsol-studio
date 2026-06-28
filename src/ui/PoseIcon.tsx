import type { PoseJoints, Vec3 } from '../data/poses';

type Props = {
  joints: PoseJoints;
  size?: number;
  active?: boolean;
};

const toDeg = (rad: number) => (rad * 180) / Math.PI;

function limbEnd(pivot: [number, number], rot: Vec3, length: number, kind: 'arm' | 'leg'): [number, number] {
  const xDeg = toDeg(rot[0]);
  const zDeg = toDeg(rot[2]);
  const theta = ((kind === 'arm' ? zDeg - xDeg : zDeg - xDeg * 0.3) * Math.PI) / 180;
  const sign = kind === 'arm' ? -1 : 1;
  return [pivot[0] + sign * length * Math.sin(theta), pivot[1] + length * Math.cos(theta)];
}

export default function PoseIcon({ joints, size = 28, active = false }: Props) {
  const lean = toDeg(joints.root.rotation[0]);
  const stroke = active ? '#3a6fd8' : '#9b9583';

  const shoulderL: [number, number] = [24, 25];
  const shoulderR: [number, number] = [40, 25];
  const hipL: [number, number] = [28, 40];
  const hipR: [number, number] = [36, 40];

  const [lax, lay] = limbEnd(shoulderL, joints.leftArm.rotation, 15, 'arm');
  const [rax, ray] = limbEnd(shoulderR, joints.rightArm.rotation, 15, 'arm');
  const [llx, lly] = limbEnd(hipL, joints.leftLeg.rotation, 17, 'leg');
  const [rlx, rly] = limbEnd(hipR, joints.rightLeg.rotation, 17, 'leg');

  return (
    <svg className="pose-icon" width={size} height={size} viewBox="0 0 64 64">
      <g transform={`rotate(${-lean} 32 32)`} stroke={stroke} strokeWidth={4} strokeLinecap="round" fill="none">
        <line x1={32} y1={22} x2={32} y2={40} />
        <line x1={shoulderL[0]} y1={shoulderL[1]} x2={lax} y2={lay} />
        <line x1={shoulderR[0]} y1={shoulderR[1]} x2={rax} y2={ray} />
        <line x1={hipL[0]} y1={hipL[1]} x2={llx} y2={lly} />
        <line x1={hipR[0]} y1={hipR[1]} x2={rlx} y2={rly} />
        <circle cx={32} cy={14} r={7} fill={stroke} stroke="none" />
      </g>
    </svg>
  );
}
