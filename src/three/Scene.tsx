import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import CharacterView from './CharacterView';
import PaintController from './PaintController';
import PaintBlobs from './PaintBlobs';
import { brushHover } from './brushHover';
import { cameraRig } from './cameraRig';
import { usePaintStore } from '../store/usePaintStore';
import { usePoseStore } from '../store/usePoseStore';
import { useStageStore } from '../store/useStageStore';

// 3D brush cursor — ring + crosshair that sits ON the surface and tilts to the
// surface normal. White shapes with a dark outline so it's always visible
// regardless of the paint color underneath, and a constant world size whether
// you're over the figure or off it.
function BrushDecal() {
  const ref = useRef<THREE.Group>(null);
  const light = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const dark = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#181613',
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const q = useRef(new THREE.Quaternion());
  const up = useRef(new THREE.Vector3(0, 0, 1));

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const ps = usePaintStore.getState();
    const show = ps.paintMode && (ps.tool === 'brush' || ps.tool === 'eraser') && brushHover.active;
    g.visible = show;
    if (!show) return;
    g.position.copy(brushHover.point).addScaledVector(brushHover.normal, 0.008);
    q.current.setFromUnitVectors(up.current, brushHover.normal);
    g.quaternion.copy(q.current);
    const r = 0.06 + ps.brushSize * 0.6;
    g.scale.set(r, r, r);
  });

  return (
    <group ref={ref} visible={false}>
      {/* dark outline layer */}
      <mesh material={dark} renderOrder={998}>
        <ringGeometry args={[0.8, 1.06, 48]} />
      </mesh>
      <mesh material={dark} renderOrder={998}>
        <planeGeometry args={[1.9, 0.11]} />
      </mesh>
      <mesh material={dark} renderOrder={998}>
        <planeGeometry args={[0.11, 1.9]} />
      </mesh>
      {/* white core layer */}
      <mesh material={light} renderOrder={999}>
        <ringGeometry args={[0.85, 1.0, 48]} />
      </mesh>
      <mesh material={light} renderOrder={999}>
        <planeGeometry args={[1.74, 0.05]} />
      </mesh>
      <mesh material={light} renderOrder={999}>
        <planeGeometry args={[0.05, 1.74]} />
      </mesh>
    </group>
  );
}

function CamoSurface({
  position,
  rotation,
  size,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  color: string;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      ref={(m) => {
        if (m) {
          m.userData.sampleColor = () => color;
        }
      }}
    >
      <planeGeometry args={size} />
      {/* unlit + tone-mapping off so the wall shows its exact hex — the same
          color the eyedropper reports and the brush paints. */}
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

// Applies character position + turntable rotation from the stage store without
// re-rendering on every change.
function CharacterRig() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { charX, charY, charZ, charRotY, charScale } = useStageStore.getState();
    g.position.x = charX;
    g.position.y = charY;
    g.position.z = charZ;
    g.rotation.y = charRotY;
    g.scale.setScalar(charScale);
  });
  return (
    <group ref={ref}>
      <CharacterView />
    </group>
  );
}

// Keeps the flat backdrop locked to the 3D scene: it scales with camera zoom
// and shifts with camera pan, so the whole composition zooms/pans together.
function CameraSync() {
  const { camera, gl } = useThree();
  const refDist = useRef(0);
  const target = useRef(new THREE.Vector3());
  const ndc = useRef(new THREE.Vector3());
  useFrame(() => {
    const el = document.getElementById('stage-bg') as HTMLImageElement | null;
    if (!el) return;
    target.current.set(0, 0.9, 0);
    if (cameraRig.controls) target.current.copy(cameraRig.controls.target);
    const dist = camera.position.distanceTo(target.current);
    if (!refDist.current) refDist.current = dist;
    ndc.current.copy(target.current).project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    const tx = ndc.current.x * 0.5 * rect.width;
    const ty = -ndc.current.y * 0.5 * rect.height;
    const scale = refDist.current / dist;
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  });
  return null;
}

// Left-drag spins the character (turntable). Shift + left-drag pans the camera
// on the X/Y screen axes — an easy pan that doesn't need a middle mouse button.
function TurntableDrag() {
  const { gl, camera } = useThree();
  useEffect(() => {
    const dom = gl.domElement;
    let dragging = false;
    let panning = false;
    let lastX = 0;
    let lastY = 0;
    const right = new THREE.Vector3();
    const upv = new THREE.Vector3();
    const move3 = new THREE.Vector3();

    const panCamera = (dx: number, dy: number) => {
      const ctrls = cameraRig.controls;
      if (!ctrls) return;
      const cam = ctrls.object as THREE.PerspectiveCamera;
      const dist = cam.position.distanceTo(ctrls.target);
      const viewH = 2 * dist * Math.tan(((cam.fov ?? 36) / 2) * (Math.PI / 180));
      const k = viewH / dom.clientHeight;
      right.setFromMatrixColumn(cam.matrix, 0);
      upv.setFromMatrixColumn(cam.matrix, 1);
      move3.copy(right).multiplyScalar(-dx * k).addScaledVector(upv, dy * k);
      cam.position.add(move3);
      ctrls.target.add(move3);
      ctrls.update();
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (usePoseStore.getState().wheelOpen) return;
      // Shift+drag pans the camera in any mode (even while painting).
      if (e.shiftKey) {
        dragging = true;
        panning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      if (usePaintStore.getState().paintMode) return; // paint owns plain left-drag
      dragging = true;
      panning = false;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (panning) panCamera(dx, dy);
      else useStageStore.getState().nudgeRotY(dx * 0.01);
    };
    const up = () => {
      dragging = false;
      panning = false;
    };
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl, camera]);
  return null;
}

type Props = {
  captureRef: { current: (() => string | null) | null };
};

export default function Scene({ captureRef }: Props) {
  const bgImage = useStageStore((s) => s.bgImage);

  return (
    <Canvas
      flat
      gl={{ preserveDrawingBuffer: true, alpha: true }}
      camera={{ position: [3.5, 2.2, 5.5], fov: 36 }}
      dpr={[1, 2]}
      onCreated={(state) => {
        // Composite the flat HTML backdrop (if any) under the WebGL render so
        // a saved PFP includes the reference background.
        captureRef.current = () => {
          const glCanvas = state.gl.domElement;
          const bg = document.getElementById('stage-bg') as HTMLImageElement | null;
          if (!bg || !bg.complete || !bg.naturalWidth) return glCanvas.toDataURL('image/png');
          const out = document.createElement('canvas');
          out.width = glCanvas.width;
          out.height = glCanvas.height;
          const ctx = out.getContext('2d')!;
          // contain-fit the background (whole image visible, like on screen)
          const scale = Math.min(out.width / bg.naturalWidth, out.height / bg.naturalHeight);
          const dw = bg.naturalWidth * scale;
          const dh = bg.naturalHeight * scale;
          ctx.drawImage(bg, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
          ctx.drawImage(glCanvas, 0, 0, out.width, out.height);
          return out.toDataURL('image/png');
        };
      }}
    >
      {!bgImage && <color attach="background" args={['#e9e4d8']} />}
      <ambientLight intensity={0.85} />
      <directionalLight position={[2.5, 4, 2]} intensity={0.9} />
      <Environment preset="city" />

      {!bgImage && (
        <>
          <CamoSurface position={[0, 0, -1.4]} rotation={[0, 0, 0]} size={[6, 4]} color="#7fa893" />
          <CamoSurface position={[0, -0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[6, 6]} color="#b89766" />
        </>
      )}

      <CharacterRig />

      <PaintController />
      <PaintBlobs />
      <BrushDecal />
      <TurntableDrag />
      <CameraSync />

      <OrbitControls
        makeDefault
        ref={(c) => {
          cameraRig.controls = (c as unknown as typeof cameraRig.controls) ?? null;
        }}
        target={[0, 0.9, 0]}
        minDistance={0.4}
        maxDistance={30}
        zoomSpeed={1.4}
        enablePan
        screenSpacePanning
        panSpeed={1.1}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI * 0.85}
        mouseButtons={{
          LEFT: -1 as unknown as THREE.MOUSE,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
    </Canvas>
  );
}
