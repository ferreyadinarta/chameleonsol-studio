import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { usePoseStore } from '../store/usePoseStore';
import type { PoseJoints, Vec3 } from '../data/poses';
import PaintablePart, { CLAY_COLOR, CLAY_ROUGHNESS, CLAY_METALNESS } from './PaintablePart';

function JointCap({ radius, position }: { radius: number; position: Vec3 }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[radius, 18, 14]} />
      <meshStandardMaterial color={CLAY_COLOR} roughness={CLAY_ROUGHNESS} metalness={CLAY_METALNESS} />
    </mesh>
  );
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
    THREE.MathUtils.lerp(a[2], b[2], t),
  ];
}

function blendJoints(locked: PoseJoints, hovered: PoseJoints | null, t: number): PoseJoints {
  if (!hovered || t <= 0) return locked;
  return {
    root: {
      rotation: lerpVec3(locked.root.rotation, hovered.root.rotation, t),
      position: lerpVec3(locked.root.position, hovered.root.position, t),
    },
    torso: { rotation: lerpVec3(locked.torso.rotation, hovered.torso.rotation, t) },
    head: { rotation: lerpVec3(locked.head.rotation, hovered.head.rotation, t) },
    leftArm: { rotation: lerpVec3(locked.leftArm.rotation, hovered.leftArm.rotation, t) },
    rightArm: { rotation: lerpVec3(locked.rightArm.rotation, hovered.rightArm.rotation, t) },
    leftLeg: { rotation: lerpVec3(locked.leftLeg.rotation, hovered.leftLeg.rotation, t) },
    rightLeg: { rotation: lerpVec3(locked.rightLeg.rotation, hovered.rightLeg.rotation, t) },
  };
}

export default function Character() {
  const rootRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const geometries = useMemo(
    () => ({
      torso: new THREE.CapsuleGeometry(0.27, 0.42, 8, 18),
      head: new THREE.SphereGeometry(0.34, 28, 20),
      arm: new THREE.CapsuleGeometry(0.115, 0.46, 8, 16),
      leg: new THREE.CapsuleGeometry(0.155, 0.52, 8, 16),
    }),
    [],
  );

  useFrame(() => {
    const { lockedPoseId, hoveredPoseId, glideAmount, getPose } = usePoseStore.getState();
    const locked = getPose(lockedPoseId).joints;
    const hovered = hoveredPoseId ? getPose(hoveredPoseId).joints : null;
    const joints = blendJoints(locked, hovered, glideAmount);

    rootRef.current?.position.set(...joints.root.position);
    rootRef.current?.rotation.set(...joints.root.rotation);
    torsoRef.current?.rotation.set(...joints.torso.rotation);
    headRef.current?.rotation.set(...joints.head.rotation);
    leftArmRef.current?.rotation.set(...joints.leftArm.rotation);
    rightArmRef.current?.rotation.set(...joints.rightArm.rotation);
    leftLegRef.current?.rotation.set(...joints.leftLeg.rotation);
    rightLegRef.current?.rotation.set(...joints.rightLeg.rotation);
  });

  return (
    <group ref={rootRef} position={[0, 0.55, 0]}>
      <group ref={torsoRef}>
        <group position={[0, 0.34, 0]}>
          <PaintablePart geometry={geometries.torso} />
        </group>

        <JointCap radius={0.18} position={[0, 0.62, 0]} />

        <group ref={headRef} position={[0, 0.78, 0]}>
          <group position={[0, 0.22, 0]}>
            <PaintablePart geometry={geometries.head} />
          </group>
        </group>

        <JointCap radius={0.13} position={[-0.36, 0.6, 0]} />
        <group ref={leftArmRef} position={[-0.36, 0.6, 0]}>
          <group position={[0, -0.34, 0]}>
            <PaintablePart geometry={geometries.arm} />
          </group>
        </group>
        <JointCap radius={0.13} position={[0.36, 0.6, 0]} />
        <group ref={rightArmRef} position={[0.36, 0.6, 0]}>
          <group position={[0, -0.34, 0]}>
            <PaintablePart geometry={geometries.arm} />
          </group>
        </group>

        <JointCap radius={0.16} position={[-0.15, -0.02, 0]} />
        <group ref={leftLegRef} position={[-0.15, -0.02, 0]}>
          <group position={[0, -0.4, 0]}>
            <PaintablePart geometry={geometries.leg} />
          </group>
        </group>
        <JointCap radius={0.16} position={[0.15, -0.02, 0]} />
        <group ref={rightLegRef} position={[0.15, -0.02, 0]}>
          <group position={[0, -0.4, 0]}>
            <PaintablePart geometry={geometries.leg} />
          </group>
        </group>
      </group>
    </group>
  );
}
