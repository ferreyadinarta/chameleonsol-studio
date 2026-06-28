import { usePoseStore, POSES } from '../store/usePoseStore';
import { usePaintStore } from '../store/usePaintStore';
import PoseIcon from './PoseIcon';

export default function ReferenceCard() {
  const lockedPoseId = usePoseStore((s) => s.lockedPoseId);
  const paintMode = usePaintStore((s) => s.paintMode);
  const pose = POSES.find((p) => p.id === lockedPoseId) ?? POSES[0];

  return (
    <div className="reference-card">
      <div className="reference-card-header">
        <span>REFERENCE</span>
        <span className="reference-card-handle">⠿</span>
      </div>
      <div className="reference-card-figure">
        <PoseIcon joints={pose.joints} size={96} active />
      </div>
      <div className="reference-card-footer">
        <span>{pose.label}</span>
        {paintMode && <span className="reference-card-badge">PAINT</span>}
      </div>
    </div>
  );
}
