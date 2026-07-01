import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CharacterView from './CharacterView';
import PaintController from './PaintController';
import PaintBlobs from './PaintBlobs';
import { brushHover } from './brushHover';
import { cameraRig } from './cameraRig';
import { usePaintStore } from '../store/usePaintStore';
import { useStageStore } from '../store/useStageStore';

// 3D brush cursor — ring + crosshair that sits ON the surface and tilts to the
// surface normal. White shapes with a dark outline so it's always visible
// regardless of the paint color underneath, and a constant world size whether
// you're over the figure or off it.
function BrushDecal() {
  const ref = useRef<THREE.Group>(null);
  const crossRef = useRef<THREE.Group>(null);
  // Brush = white ring + upright crosshair. Eraser = amber ring + an X mark,
  // so the two tools are unmistakable at a glance, not just by color.
  const light = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
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
    const isEraser = ps.tool === 'eraser';
    const show = ps.paintMode && (ps.tool === 'brush' || isEraser) && brushHover.active;
    g.visible = show;
    if (!show) return;
    g.position.copy(brushHover.point).addScaledVector(brushHover.normal, 0.008);
    q.current.setFromUnitVectors(up.current, brushHover.normal);
    g.quaternion.copy(q.current);
    const r = 0.06 + ps.brushSize * 0.6;
    g.scale.set(r, r, r);
    light.color.set(isEraser ? '#e8913a' : '#ffffff');
    if (crossRef.current) crossRef.current.rotation.z = isEraser ? Math.PI / 4 : 0;
  });

  return (
    <group ref={ref} visible={false}>
      {/* rings are rotationally symmetric, so they don't need to be in the
          rotating crosshair group */}
      <mesh material={dark} renderOrder={998}>
        <ringGeometry args={[0.8, 1.06, 48]} />
      </mesh>
      <mesh material={light} renderOrder={999}>
        <ringGeometry args={[0.85, 1.0, 48]} />
      </mesh>
      {/* crosshair: a "+" for brush, rotated to an "×" for eraser */}
      <group ref={crossRef}>
        <mesh material={dark} renderOrder={998}>
          <planeGeometry args={[1.9, 0.11]} />
        </mesh>
        <mesh material={dark} renderOrder={998}>
          <planeGeometry args={[0.11, 1.9]} />
        </mesh>
        <mesh material={light} renderOrder={999}>
          <planeGeometry args={[1.74, 0.05]} />
        </mesh>
        <mesh material={light} renderOrder={999}>
          <planeGeometry args={[0.05, 1.74]} />
        </mesh>
      </group>
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

type Props = {
  captureRef: { current: (() => string | null) | null };
};

export default function Scene({ captureRef }: Props) {
  const bgImage = useStageStore((s) => s.bgImage);
  const paintMode = usePaintStore((s) => s.paintMode);

  // Hold Space to pan — the same convention as Figma/Photoshop/Illustrator,
  // which reads more natural than a Shift-modifier or middle-click (not every
  // mouse/trackpad has a reliable middle button).
  const [spaceDown, setSpaceDown] = useState(false);
  useEffect(() => {
    const typing = () => {
      const a = document.activeElement;
      return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || typing()) return;
      e.preventDefault(); // stop the page from scrolling
      setSpaceDown(true);
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

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
      {/* Ambient dominates so painted colors stay close to their exact hex;
          the soft directional light (no shadow map) only adds a whisper of
          gradient across the form so the 3D shape still reads up close. */}
      <ambientLight intensity={2.4} />
      <directionalLight position={[2, 3.2, 2.6]} intensity={0.7} />

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
          // Drag orbits the camera — the single primary gesture. In paint
          // mode, left-drag paints instead, so right-drag orbits there.
          // Hold Space to pan (Figma/Photoshop convention); middle-drag still
          // pans too as a bonus for anyone with a 3-button mouse.
          LEFT: (spaceDown ? THREE.MOUSE.PAN : paintMode ? -1 : THREE.MOUSE.ROTATE) as THREE.MOUSE,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
      <GrabCursor active={spaceDown} />
    </Canvas>
  );
}

// Swaps the canvas cursor to an open/closed hand while Space is held, so
// panning has the same visual feedback users expect from design tools.
function GrabCursor({ active }: { active: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    const dom = gl.domElement;
    if (!active) {
      dom.style.cursor = '';
      return;
    }
    dom.style.cursor = 'grab';
    const down = () => (dom.style.cursor = 'grabbing');
    const up = () => (dom.style.cursor = 'grab');
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => {
      dom.style.cursor = '';
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, [active, gl]);
  return null;
}
