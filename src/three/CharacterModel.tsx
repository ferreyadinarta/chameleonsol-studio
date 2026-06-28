import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

// Drop a model at public/character.glb to use it instead of the procedural
// figure. This is a PREVIEW loader — it normalizes size/position so you can
// judge the shape. Paint + pose hookup comes once the right model is chosen.
export const MODEL_URL = '/character.glb';

// Target height in world units (feet rest at y = 0). Matches the procedural rig.
const TARGET_HEIGHT = 1.95;

export default function CharacterModel() {
  const { scene } = useGLTF(MODEL_URL);
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // reset, then fit the model to a known height with feet on the floor.
    // Flush matrices after the reset so the measurement is identity-relative
    // and idempotent across React's double-invoked effects.
    group.scale.setScalar(1);
    group.position.set(0, 0, 0);
    group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    group.scale.setScalar(scale);
    group.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    const bones: Record<string, THREE.Bone> = {};
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      if ((obj as THREE.Bone).isBone) bones[obj.name] = obj as THREE.Bone;
    });

    // Bring the arms down from the T-pose bind into a standing pose.
    const lShoulder = bones['Bone002_3'];
    const rShoulder = bones['Bone005_6'];
    if (lShoulder) lShoulder.rotation.z = -1.4;
    if (rShoulder) rShoulder.rotation.z = 1.4;
  }, [scene]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
