import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { usePoseStore } from "../store/usePoseStore";
import type { PoseJoints, Vec3 } from "../data/poses";
import PaintablePart from "./PaintablePart";

// Paintable sphere that fuses limbs into the body — no visible seams,
// and the surface accepts brush strokes like every other part.
function JointCap({
  geometry,
  position,
}: {
  geometry: THREE.BufferGeometry;
  position: Vec3;
}) {
  return (
    <group position={position}>
      <PaintablePart geometry={geometry} />
    </group>
  );
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
    THREE.MathUtils.lerp(a[2], b[2], t),
  ];
}

function blendJoints(
  locked: PoseJoints,
  hovered: PoseJoints | null,
  t: number,
): PoseJoints {
  if (!hovered || t <= 0) return locked;
  return {
    root: {
      rotation: lerpVec3(locked.root.rotation, hovered.root.rotation, t),
      position: lerpVec3(locked.root.position, hovered.root.position, t),
    },
    torso: {
      rotation: lerpVec3(locked.torso.rotation, hovered.torso.rotation, t),
    },
    head: {
      rotation: lerpVec3(locked.head.rotation, hovered.head.rotation, t),
    },
    leftArm: {
      rotation: lerpVec3(locked.leftArm.rotation, hovered.leftArm.rotation, t),
    },
    rightArm: {
      rotation: lerpVec3(
        locked.rightArm.rotation,
        hovered.rightArm.rotation,
        t,
      ),
    },
    leftLeg: {
      rotation: lerpVec3(locked.leftLeg.rotation, hovered.leftLeg.rotation, t),
    },
    rightLeg: {
      rotation: lerpVec3(
        locked.rightLeg.rotation,
        hovered.rightLeg.rotation,
        t,
      ),
    },
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

  const geometries = useMemo(() => {
    const lathe = (profile: [number, number][], seg = 28) => {
      const g = new THREE.LatheGeometry(
        profile.map(([x, y]) => new THREE.Vector2(x, y)),
        seg,
      );
      g.computeVertexNormals();
      return g;
    };

    // Slim bean body of revolution — narrow, soft shoulders, thin neck.
    // No belly/torso seam; reads as the smooth Meccha clay figure.
    const body = lathe(
      [
        [0.01, -0.5],
        [0.1, -0.45],
        [0.17, -0.37],
        [0.22, -0.25],
        [0.245, -0.1],
        [0.25, 0.05],
        [0.24, 0.2],
        [0.245, 0.33],
        [0.235, 0.43], // gentle rounded shoulders
        [0.195, 0.51],
        [0.13, 0.58], // slope into a thin neck
        [0.08, 0.63],
        [0.04, 0.66],
        [0.01, 0.68],
      ],
      40,
    );

    // Single tapered "noodle" limbs — one piece each, rounded tip, no
    // separate hand/foot sphere, so there are no ring seams. Built hanging
    // downward from the joint (y = 0) so the pose rig swings them naturally.
    const arm = lathe([
      [0.082, 0.02],
      [0.088, -0.07],
      [0.085, -0.22],
      [0.078, -0.37],
      [0.07, -0.49],
      [0.06, -0.57],
      [0.046, -0.62],
      [0.028, -0.655],
      [0.006, -0.67],
    ]);
    const leg = lathe([
      [0.1, 0.02],
      [0.107, -0.08],
      [0.103, -0.26],
      [0.094, -0.43],
      [0.083, -0.57],
      [0.07, -0.66],
      [0.054, -0.71],
      [0.032, -0.74],
      [0.007, -0.755],
    ]);

    return {
      body,
      arm,
      leg,
      head: new THREE.SphereGeometry(0.29, 30, 22),
      neck: new THREE.SphereGeometry(0.1, 18, 14),
      shoulder: new THREE.SphereGeometry(0.1, 18, 14),
      hip: new THREE.SphereGeometry(0.12, 18, 14),
    };
  }, []);

  useFrame(() => {
    const { lockedPoseId, hoveredPoseId, glideAmount, getPose } =
      usePoseStore.getState();
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
        {/* single smooth slim bean body */}
        <group position={[0, 0.34, 0]}>
          <PaintablePart geometry={geometries.body} />
        </group>

        {/* thin neck + ball head sitting close to the shoulders */}
        <JointCap geometry={geometries.neck} position={[0, 1.0, 0]} />
        <group ref={headRef} position={[0, 1.02, 0]}>
          <group position={[0, 0.2, 0]}>
            <PaintablePart geometry={geometries.head} />
          </group>
        </group>

        {/* thin tapered arms hanging close to the body */}
        <JointCap geometry={geometries.shoulder} position={[-0.24, 0.6, 0]} />
        <group ref={leftArmRef} position={[-0.24, 0.6, 0]}>
          <PaintablePart geometry={geometries.arm} />
        </group>
        <JointCap geometry={geometries.shoulder} position={[0.24, 0.6, 0]} />
        <group ref={rightArmRef} position={[0.24, 0.6, 0]}>
          <PaintablePart geometry={geometries.arm} />
        </group>

        {/* thin tapered legs with rounded tips */}
        <JointCap geometry={geometries.hip} position={[-0.12, -0.04, 0]} />
        <group ref={leftLegRef} position={[-0.12, -0.04, 0]}>
          <PaintablePart geometry={geometries.leg} />
        </group>
        <JointCap geometry={geometries.hip} position={[0.12, -0.04, 0]} />
        <group ref={rightLegRef} position={[0.12, -0.04, 0]}>
          <PaintablePart geometry={geometries.leg} />
        </group>
      </group>
    </group>
  );
}
