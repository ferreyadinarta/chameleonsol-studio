import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { usePoseStore } from '../store/usePoseStore';
import { attachPaintToMesh } from './PaintablePart';
import { repackPaintUVs } from './repackPaintUVs';
import { GLB_POSES, buildPoseQuaternions, type GlbPose } from './glbRig';

// Drop a model at public/character.glb to use it instead of the procedural
// figure. Bone-driven posing is wired to the pose store.
export const MODEL_URL = '/character.glb';

const TARGET_HEIGHT = 1.95;

type PoseQuats = Record<string, THREE.Quaternion>;

const _tmpQ = new THREE.Quaternion();
const _gp = new THREE.Vector3();
const _ge = new THREE.Euler();

// A thin inverted-hull outline so the (unlit, flat) figure still has a faint
// silhouette — you can tell it's there even when painted the same color as the
// background. Pushes the back faces out slightly along their normals.
function makeOutlineMaterial(): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({
    color: '#2c2a26',
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.28,
    toneMapped: false,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.outlineWidth = { value: 0.012 };
    shader.vertexShader =
      'uniform float outlineWidth;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  transformed += normalize(normal) * outlineWidth;',
      );
  };
  return m;
}

function addOutline(mesh: THREE.SkinnedMesh): THREE.SkinnedMesh {
  const outline = new THREE.SkinnedMesh(mesh.geometry, makeOutlineMaterial());
  outline.bind(mesh.skeleton, mesh.bindMatrix);
  outline.bindMode = mesh.bindMode;
  outline.frustumCulled = false;
  outline.renderOrder = -1;
  mesh.add(outline);
  return outline;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function CharacterModel() {
  const { scene } = useGLTF(MODEL_URL);
  const fitRef = useRef<THREE.Group>(null);
  const poseRef = useRef<THREE.Group>(null);

  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const bindRef = useRef<Record<string, THREE.Quaternion>>({});
  const poseQuatsRef = useRef<Record<string, PoseQuats>>({});
  const rootBoneRef = useRef<THREE.Object3D | null>(null);
  const cleanupsRef = useRef<Array<() => void>>([]);

  useLayoutEffect(() => {
    const fit = fitRef.current;
    if (!fit) return;

    // Fit: scale to a known height with feet on the floor. Flush matrices so
    // the measurement is idempotent across React's double-invoked effects.
    fit.scale.setScalar(1);
    fit.position.set(0, 0, 0);
    fit.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    fit.scale.setScalar(scale);
    fit.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    // Collect bones + bind orientations, enable shadows, make meshes paintable.
    const bones: Record<string, THREE.Bone> = {};
    let rootBone: THREE.Object3D | null = null;
    const cleanups: Array<() => void> = [];
    scene.traverse((obj) => {
      const mesh = obj as THREE.SkinnedMesh;
      if (mesh.isMesh && !mesh.userData.isOutline) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        if (mesh.isSkinnedMesh) repackPaintUVs(mesh); // before attachPaintToMesh: raycasts must see the fixed UVs
        cleanups.push(attachPaintToMesh(mesh));
        if (mesh.isSkinnedMesh) {
          const outline = addOutline(mesh);
          outline.userData.isOutline = true;
          cleanups.push(() => {
            mesh.remove(outline);
            (outline.material as THREE.Material).dispose();
          });
        }
      }
      if ((obj as THREE.Bone).isBone) {
        bones[obj.name] = obj as THREE.Bone;
        if (obj.name.includes('rootJoint')) rootBone = obj;
      }
    });
    bonesRef.current = bones;
    rootBoneRef.current = rootBone ?? scene;
    cleanupsRef.current = cleanups;

    const bind: Record<string, THREE.Quaternion> = {};
    for (const name in bones) bind[name] = bones[name].quaternion.clone();
    bindRef.current = bind;

    // Precompute target quaternions for every pose.
    const poseQuats: Record<string, PoseQuats> = {};
    for (const id in GLB_POSES) {
      poseQuats[id] = buildPoseQuaternions(bones, bind, rootBoneRef.current!, GLB_POSES[id]);
    }
    poseQuatsRef.current = poseQuats;

    return () => {
      cleanupsRef.current.forEach((fn) => fn());
      cleanupsRef.current = [];
    };
  }, [scene]);

  useFrame(() => {
    const bones = bonesRef.current;
    const poseQuats = poseQuatsRef.current;
    const bind = bindRef.current;
    if (!Object.keys(bones).length || !Object.keys(poseQuats).length) return;

    const { lockedPoseId, hoveredPoseId, glideAmount } = usePoseStore.getState();
    const blending = !!hoveredPoseId && glideAmount > 0 && hoveredPoseId !== lockedPoseId;
    const A = poseQuats[lockedPoseId] ?? bind;
    const B = blending ? (poseQuats[hoveredPoseId!] ?? bind) : null;

    for (const name in bones) {
      const qa = A[name] ?? bind[name];
      if (B) {
        const qb = B[name] ?? bind[name];
        _tmpQ.copy(qa).slerp(qb, glideAmount);
        bones[name].quaternion.copy(_tmpQ);
      } else {
        bones[name].quaternion.copy(qa);
      }
    }

    // Whole-body group transform (used to lay the figure down).
    const pose = poseRef.current;
    if (pose) {
      const ga: GlbPose | undefined = GLB_POSES[lockedPoseId];
      const gb: GlbPose | undefined = B ? GLB_POSES[hoveredPoseId!] : undefined;
      const ar = ga?.groupRot ?? [0, 0, 0];
      const ap = ga?.groupPos ?? [0, 0, 0];
      const br = gb?.groupRot ?? ar;
      const bp = gb?.groupPos ?? ap;
      const t = B ? glideAmount : 0;
      _ge.set(lerp(ar[0], br[0], t), lerp(ar[1], br[1], t), lerp(ar[2], br[2], t));
      _gp.set(lerp(ap[0], bp[0], t), lerp(ap[1], bp[1], t), lerp(ap[2], bp[2], t));
      pose.rotation.copy(_ge);
      pose.position.copy(_gp);
    }
  });

  return (
    <group ref={fitRef}>
      <group ref={poseRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
