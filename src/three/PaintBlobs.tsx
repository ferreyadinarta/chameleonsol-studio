import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// A pool of little paint droplets that pop out of the surface as you brush,
// arc up with gravity, shrink, and vanish — the Meccha "splatter" feel.
const POOL = 200;

type Blob = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
  active: boolean;
};

const blobs: Blob[] = Array.from({ length: POOL }, () => ({
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  color: new THREE.Color(),
  life: 0,
  maxLife: 1,
  size: 0,
  active: false,
}));

const _base = new THREE.Color();

export function spawnPaintBlobs(
  point: THREE.Vector3,
  normal: THREE.Vector3,
  colorHex: string,
  brushSize: number,
) {
  const count = 1 + Math.floor(Math.random() * 2);
  _base.set(colorHex);
  let spawned = 0;
  for (const b of blobs) {
    if (b.active) continue;
    b.active = true;
    b.pos.copy(point).addScaledVector(normal, 0.02);
    b.vel
      .copy(normal)
      .multiplyScalar(0.4 + Math.random() * 0.5)
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.45,
          0.45 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.45,
        ),
      );
    b.color.copy(_base);
    b.maxLife = 0.4 + Math.random() * 0.3;
    b.life = b.maxLife;
    b.size = (0.014 + brushSize * 0.06) * (0.7 + Math.random() * 0.6);
    if (++spawned >= count) break;
  }
}

export default function PaintBlobs() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.05);
    const d = dummy.current;

    for (let i = 0; i < POOL; i++) {
      const b = blobs[i];
      if (b.active) {
        b.vel.y -= 3.4 * dt;
        b.pos.addScaledVector(b.vel, dt);
        b.life -= dt;
        if (b.life <= 0 || b.pos.y < -0.1) b.active = false;
      }
      if (b.active) {
        const t = Math.max(0, b.life / b.maxLife);
        d.position.copy(b.pos);
        d.scale.setScalar(b.size * (0.35 + 0.65 * t));
      } else {
        d.position.set(0, -999, 0);
        d.scale.setScalar(0);
      }
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, b.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, POOL]} frustumCulled={false} castShadow>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial roughness={0.45} metalness={0.05} />
    </instancedMesh>
  );
}
